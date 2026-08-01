from datetime import datetime, timezone
from typing import TYPE_CHECKING
from uuid import UUID, uuid4
from app.core.db import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import DateTime, ForeignKey, UUID as PG_UUID, String
import enum
from sqlalchemy import Enum as SAEnum

if TYPE_CHECKING:
    from app.modules.invitations.model import ProjectInvitation


class NotificationType(str, enum.Enum):
    PROJECT_INVITATION = "project_invitation"
    GENERAL = "general"


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    body: Mapped[str] = mapped_column(String, nullable=False)
    type: Mapped[NotificationType] = mapped_column(
        SAEnum(NotificationType, name="notificationtype"),
        default=NotificationType.GENERAL,
    )
    is_read: Mapped[bool] = mapped_column(default=False)
    # invitation reference
    invitation_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("project_invitations.id", ondelete="CASCADE"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # relationships
    invitation: Mapped["ProjectInvitation"] = relationship(
        "ProjectInvitation",
        back_populates="notifications",
        foreign_keys=[invitation_id],
    )
