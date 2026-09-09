from datetime import datetime, timezone
from enum import Enum
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, String, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base

if TYPE_CHECKING:
    from app.modules.projects.model import Project
    from app.modules.users.model import User


class MeetingProvider(str, Enum):
    ZOOM = "zoom"
    GOOGLE_MEET = "google_meet"


class MeetingStatus(str, Enum):
    SCHEDULED = "scheduled"
    CANCELLED = "cancelled"
    COMPLETED = "completed"


class Meeting(Base):
    __tablename__ = "meetings"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    project_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_by: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    provider: Mapped[MeetingProvider] = mapped_column(
        SAEnum(
            MeetingProvider,
            name="meeting_provider",
            values_callable=lambda enum_type: [item.value for item in enum_type],
        ),
        nullable=False,
    )
    meeting_id: Mapped[str] = mapped_column(String(255), nullable=False)
    join_url: Mapped[str] = mapped_column(String(2048), nullable=False)
    host_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    topic: Mapped[str] = mapped_column(String(255), nullable=False)
    start_time: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    end_time: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    status: Mapped[MeetingStatus] = mapped_column(
        SAEnum(
            MeetingStatus,
            name="meeting_status",
            values_callable=lambda enum_type: [item.value for item in enum_type],
        ),
        default=MeetingStatus.SCHEDULED,
        nullable=False,
    )
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=True,
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=True,
    )

    project: Mapped["Project"] = relationship(
        "Project",
        foreign_keys=[project_id],
    )
    creator: Mapped["User"] = relationship(
        "User",
        foreign_keys=[created_by],
    )
