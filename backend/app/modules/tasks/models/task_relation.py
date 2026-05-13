from datetime import datetime, timezone
from app.core.db import Base
from sqlalchemy.orm import Mapped, mapped_column
from uuid import UUID
from sqlalchemy import DateTime, ForeignKey, UUID as PG_UUID
import enum

"""
    This is the documents of files that you can upload to a task
"""


class Relation(enum.Enum):
    BLOCKS = "blocks"
    BLOCKED_BY = "blocked_by"
    RELATED = "related"
    NONE = "none"


class TaskRelation(Base):
    __tablename__ = "task_relations"

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("tasks.id")
    )
    related_to: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("tasks.id")
    )
    relation: Mapped[Relation] = mapped_column(default=Relation.NONE, nullable=True)
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
