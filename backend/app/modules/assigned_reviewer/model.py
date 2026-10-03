from datetime import datetime, timezone
from uuid import UUID, uuid4
from app.core.db import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import DateTime, ForeignKey, UUID as PG_UUID
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.modules.project_members.model import ProjectMember
    from app.modules.tasks.model import Task


class AssignedReviewer(Base):
    __tablename__ = "assigned_reviewer"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    member_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("project_members.id")
    )
    task_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE")
    )
    # timestamp
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # relationship
    task: Mapped["Task"] = relationship(
        "Task",
        back_populates="assigned_reviewers",
        foreign_keys=[task_id],
    )
    members: Mapped["ProjectMember"] = relationship(
        "ProjectMember",
        back_populates="assigned_reviewers",
        foreign_keys=[member_id],
    )