from datetime import datetime, timezone
from app.core.db import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship
from uuid import UUID, uuid4
from sqlalchemy import DateTime, ForeignKey, UUID as PG_UUID
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.modules.tasks.model import Task
    from app.modules.project_members.model import ProjectMember


"""
    This is the assigned member for each tasks
"""


class AssignedMember(Base):
    __tablename__ = "assigned_members"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    member_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("project_members.id")
    )
    task_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE")
    )
    effort_share: Mapped[float] = mapped_column(default=0.0, nullable=True)
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

    # Relationships
    task: Mapped["Task"] = relationship(
        "Task",
        back_populates="assigned_members",
        foreign_keys=[task_id],
    )
    members: Mapped["ProjectMember"] = relationship(
        "ProjectMember",
        back_populates="assigned_members",
        foreign_keys=[member_id],
    )
