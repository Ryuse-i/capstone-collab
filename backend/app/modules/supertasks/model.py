from datetime import date, datetime, timezone
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import UUID as PG_UUID
from sqlalchemy import Date, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base

if TYPE_CHECKING:
    from app.modules.projects.model import Project
    from app.modules.tasks.model import Task


class Supertask(Base):
    """
    A supertask is a big chunk of a project that is broken down into
    individual tasks. Tasks carry the actual workload; a supertask only
    groups them, so its totals (points, progress) should be computed from
    its tasks rather than stored here.
    """

    __tablename__ = "supertasks"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )

    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)

    created_by: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    # A supertask only makes sense inside a project.
    project_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
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

    # Relationships
    project: Mapped["Project"] = relationship(
        "Project",
        back_populates="supertasks",
        foreign_keys=[project_id],
    )

    # No delete-orphan: deleting a supertask must NOT delete its tasks
    # (they hold assignments, submissions, workload). The FK on Task uses
    # ondelete="SET NULL", and passive_deletes lets the database do that.
    tasks: Mapped[list["Task"]] = relationship(
        "Task",
        back_populates="supertask",
        foreign_keys="Task.supertask_id",
        passive_deletes=True,
    )