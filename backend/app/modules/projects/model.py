from datetime import datetime, timezone
from uuid import UUID, uuid4
from app.core.db import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import DateTime, ForeignKey, Integer, String, UUID as PG_UUID
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.modules.project_snapshots.model import ProjectSnapshot
    from app.modules.supertasks.model import Supertask
    from app.modules.tasks.model import Task
    from app.modules.project_members.model import ProjectMember
    from app.modules.invitations.model import ProjectInvitation


class Project(Base):
    __tablename__ = "projects"

    # ID should be a UUID to match your Pydantic schemas and test logic
    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )

    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str] = mapped_column(String, nullable=False)

    # These were sa.UUID() in your migration.
    # Remove primary_key=True from these! They are just Foreign Keys.
    created_by: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    advisor: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    instructor: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    # Unit for the deadline effect on the workload calculation
    base_days_per_point: Mapped[int] = mapped_column(Integer, default=1)
    # Number of times redistribution mechanics can be triggered before flagging
    escalation_threshold: Mapped[int] = mapped_column(Integer, default=0)
    

    snapshots: Mapped[list["ProjectSnapshot"]] = relationship(
        "ProjectSnapshot",
        back_populates="project",
        cascade="all, delete-orphan",
    )

    tasks: Mapped[list["Task"]] = relationship(
        "Task",
        back_populates="project",
        cascade="all, delete-orphan",
        foreign_keys="Task.project_id",
    )

    supertasks: Mapped[list["Supertask"]] = relationship(
        "Supertask",
        back_populates="project",
        cascade="all, delete-orphan",
        foreign_keys="Supertask.project_id",
    )

    members: Mapped[list["ProjectMember"]] = relationship(
        "ProjectMember",
        back_populates="project",
        cascade="all, delete-orphan",
    )

    invitations: Mapped[list["ProjectInvitation"]] = relationship(
        "ProjectInvitation",
        back_populates="project",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    # Timestamps
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
