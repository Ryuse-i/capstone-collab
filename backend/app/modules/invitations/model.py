from datetime import datetime, timezone
from uuid import UUID, uuid4
from app.core.db import Base
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import DateTime, ForeignKey, UUID as PG_UUID, String


class ProjectInvitation(Base):
    __tablename__ = "project_invitations"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    project_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE")
    )
    sender_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id")
    )
    email: Mapped[str] = mapped_column(String, nullable=False)  # The email invited
    status: Mapped[str] = mapped_column(
        String, default="pending"
    )  # pending, accepted, declined
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
