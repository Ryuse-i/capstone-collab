from datetime import datetime, timezone
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, Text, UniqueConstraint
from sqlalchemy import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base

if TYPE_CHECKING:
    from app.modules.tasks.model import Task

"""
    This is the revision note model
    One row is created every time a reviewer rejects a submitted task.
    Rows are never overwritten, so a task rejected twice has two notes (history).
"""


class RevisionNote(Base):
    __tablename__ = "revision_notes"
    __table_args__ = (
        UniqueConstraint(
            "task_id", "revision_number", name="uq_revision_notes_task_revision"
        ),
    )

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    task_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("tasks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    revision_number: Mapped[int] = mapped_column(Integer, nullable=False)

    # What is wrong (required) and what the reviewer suggests (optional)
    problem: Mapped[str] = mapped_column(Text, nullable=False)
    recommended_changes: Mapped[str | None] = mapped_column(Text, nullable=True)

    rejected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    # Set when the assignee resubmits; NULL means the note is still open
    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    task: Mapped["Task"] = relationship("Task", back_populates="revision_notes")