from datetime import datetime, timezone
from app.core.db import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship
from uuid import UUID, uuid4
from sqlalchemy import DateTime, ForeignKey, UUID as PG_UUID
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.modules.tasks.model import Task


"""
    This is the task model
    This contains the normal tasks that would be mostly used in the system
    This is the heart of the task modules
"""


class PeerEvaluation(Base):
    __tablename__ = "peer_evaluations"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    evaluator_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id")
    )
    evaluated_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id")
    )
    task_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE")
    )
    
    # Relationships
    task: Mapped["Task"] = relationship(
        "Task",
        back_populates="peer_evaluations",
        foreign_keys=[task_id],
    )
    
    score: Mapped[int] = mapped_column(default=0, nullable=True)
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
