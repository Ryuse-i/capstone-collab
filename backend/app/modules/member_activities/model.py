import enum
from datetime import datetime, timezone
from uuid import UUID
from typing import TYPE_CHECKING

from app.core.db import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Text, String, DateTime, ForeignKey, Index, UUID as PG_UUID

if TYPE_CHECKING:
    from app.modules.project_members.model import ProjectMember


class ActivityType(str, enum.Enum):
    TASK_CREATED = "task_created"
    TASK_SUBMITTED = "task_submitted"
    TASK_STATUS_CHANGED = "task_status_changed"
    COMMENT_ADDED = "comment_added"
    MEMBER_JOINED = "member_joined"
    REVISION_REQUESTED = "revision_requested"
    SUBMISSION_ACCEPTED = "submission_accepted"


class MemberActivity(Base):
    __tablename__ = "member_activities"
    __table_args__ = (
        Index("ix_member_activities_member_created", "member_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    member_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("project_members.id", ondelete="CASCADE")
    )
    task_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("tasks.id", ondelete="SET NULL"),
        nullable=True,
    )
    type: Mapped[str | None] = mapped_column(String(40), nullable=True)

    member: Mapped["ProjectMember"] = relationship(
        "ProjectMember",
        back_populates="activities",
        foreign_keys=[member_id],
    )

    detail: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )