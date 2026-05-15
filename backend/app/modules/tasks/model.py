from datetime import datetime, timezone
from app.core.db import Base
from sqlalchemy.orm import Mapped, mapped_column
from uuid import UUID, uuid4
from sqlalchemy import DateTime, ForeignKey, String, UUID as PG_UUID
from sqlalchemy import Enum as SAENUM
from app.modules.tasks.enums import Priority, Status, Complexity, Category


"""
    This is the task model
    This contains the normal tasks that would be mostly used in the system
    This is the heart of the task modules
"""


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    name: Mapped[str] = mapped_column(String(150))
    description: Mapped[str] = mapped_column(nullable=True)
    created_by: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id")
    )
    project_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("projects.id")
    )
    # supertask_id: Mapped[UUID | None] = mapped_column(
    #    PG_UUID(as_uuid=True), ForeignKey("supertasks.id"), default=None, nullable=True
    # )
    status: Mapped[Status] = mapped_column(
        SAENUM(Status, name="status"), default=None, nullable=True
    )
    complexity: Mapped[Complexity] = mapped_column(
        SAENUM(Complexity, name="complexity"), default=None, nullable=True
    )
    priority: Mapped[Priority] = mapped_column(
        SAENUM(Priority, name="priority"), default=None, nullable=True
    )
    complexity_points: Mapped[int] = mapped_column(default=0, nullable=True)
    category: Mapped[Category] = mapped_column(
        SAENUM(Category, name="category"), default=None, nullable=True
    )
    deadline: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    total_time_spent: Mapped[int] = mapped_column(default=0, nullable=True)
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
