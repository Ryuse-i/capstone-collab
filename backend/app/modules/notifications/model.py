from datetime import datetime, timezone
from uuid import UUID, uuid4
from app.core.db import Base
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import DateTime, ForeignKey, UUID as PG_UUID
import enum
from sqlalchemy import Enum as SAEnum


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
    type: Mapped[NotificationType] = mapped_column(
        SAEnum(NotificationType, name="notificationtype"),
        default=NotificationType.GENERAL,
    )
    # invitation reference
    invitation_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
