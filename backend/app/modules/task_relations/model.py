from datetime import datetime, timezone
from app.core.db import Base
from sqlalchemy.orm import Mapped, mapped_column
from uuid import UUID
from sqlalchemy import DateTime, ForeignKey, UUID as PG_UUID
from app.modules.tasks.enums import Relation
from sqlalchemy import Enum as SAENUM

"""
    This is the relation of each tasks to each other
"""


class TaskRelation(Base):
    __tablename__ = "task_relations"

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("tasks.id")
    )
    related_to: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("tasks.id")
    )
    relation: Mapped[Relation] = mapped_column(
        SAENUM(Relation, name="relation"), default=None, nullable=True
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
