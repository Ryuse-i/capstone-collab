from datetime import datetime, timezone
from app.core.db import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship
from uuid import UUID, uuid4
from sqlalchemy import DateTime, String, ForeignKey, UUID as PG_UUID
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.modules.tasks.model import Task

"""
    This is the submission history of each task
"""


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    name: Mapped[str] = mapped_column(String(150))
    
    # Relationships
    task_tags: Mapped[list["TaskTag"]] = relationship(
        "TaskTag",
        back_populates="tag",
        cascade="all, delete-orphan",
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


class TaskTag(Base):
    __tablename__ = "task_tag"

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE")
    )
    tag_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("tags.id", ondelete="CASCADE")
    )
    
    # Relationships
    task: Mapped["Task"] = relationship(
        "Task",
        back_populates="tags",
        foreign_keys=[task_id],
    )
    
    tag: Mapped["Tag"] = relationship(
        "Tag",
        back_populates="task_tags",
        foreign_keys=[tag_id],
    )
