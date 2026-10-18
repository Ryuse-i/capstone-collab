# app/modules/invite_links/model.py
from datetime import datetime, timezone, timedelta
from typing import TYPE_CHECKING
from uuid import UUID, uuid4
from sqlalchemy import DateTime, ForeignKey, Integer, String, UUID as PG_UUID
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.db import Base
from app.modules.project_members.model import ProjectRole

if TYPE_CHECKING:
    from app.modules.projects.model import Project


def _default_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=7)


class ProjectInviteLink(Base):
    __tablename__ = "project_invite_links"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    project_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        index=True,
    )
    created_by: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id")
    )
    # role lives in the row, never in the URL
    role: Mapped[ProjectRole] = mapped_column(
        SAEnum(ProjectRole, name="invited_role", create_type=False)
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_default_expiry
    )
    max_uses: Mapped[int | None] = mapped_column(Integer, nullable=True)  # None = unlimited
    use_count: Mapped[int] = mapped_column(Integer, default=0)
    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    project: Mapped["Project"] = relationship("Project", back_populates="invite_links")