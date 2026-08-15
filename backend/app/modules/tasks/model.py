from datetime import datetime, timezone, date
from app.core.db import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship
from uuid import UUID, uuid4
from sqlalchemy import DateTime, ForeignKey, String, UUID as PG_UUID, Date, ARRAY
from sqlalchemy import Enum as SAENUM
from app.modules.tasks.enums import Priority, Status, Complexity, Category
from typing import TYPE_CHECKING
from app.modules.project_members.model import Skills

if TYPE_CHECKING:
    from app.modules.task_comments.model import TaskComment
    from app.modules.task_submissions.model import TaskSubmission
    from app.modules.task_contents.model import TaskContent
    from app.modules.task_relations.model import TaskRelation
    from app.modules.task_tags.model import TaskTag
    from app.modules.assigned_members.model import AssignedMember
    from app.modules.peer_evaluations.model import PeerEvaluation
    from app.modules.projects.model import Project

task_skills_enum = SAENUM(
    Skills,
    name="task_skills",
    values_callable=lambda obj: [e.value for e in obj],
)

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
        PG_UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE")
    )

    started_at: Mapped[date] = mapped_column(Date, nullable=True)
    completed_at: Mapped[date] = mapped_column(Date, nullable=True)

    # Relationships
    project: Mapped["Project"] = relationship(
        "Project",
        back_populates="tasks",
        foreign_keys=[project_id],
    )

    comments: Mapped[list["TaskComment"]] = relationship(
        "TaskComment",
        back_populates="task",
        cascade="all, delete-orphan",
    )

    submissions: Mapped[list["TaskSubmission"]] = relationship(
        "TaskSubmission",
        back_populates="task",
        cascade="all, delete-orphan",
    )

    contents: Mapped[list["TaskContent"]] = relationship(
        "TaskContent",
        back_populates="task",
        cascade="all, delete-orphan",
    )

    task_relations: Mapped[list["TaskRelation"]] = relationship(
        "TaskRelation",
        back_populates="task",
        foreign_keys="TaskRelation.task_id",
        cascade="all, delete-orphan",
        primaryjoin="Task.id == TaskRelation.task_id",
    )

    related_tasks: Mapped[list["TaskRelation"]] = relationship(
        "TaskRelation",
        back_populates="related_task",
        foreign_keys="TaskRelation.related_to",
        cascade="all, delete-orphan",
        primaryjoin="Task.id == TaskRelation.related_to",
    )

    tags: Mapped[list["TaskTag"]] = relationship(
        "TaskTag",
        back_populates="task",
        cascade="all, delete-orphan",
    )

    assigned_members: Mapped[list["AssignedMember"]] = relationship(
        "AssignedMember",
        back_populates="task",
        cascade="all, delete-orphan",
    )

    peer_evaluations: Mapped[list["PeerEvaluation"]] = relationship(
        "PeerEvaluation",
        back_populates="task",
        cascade="all, delete-orphan",
        foreign_keys="PeerEvaluation.task_id",
    )
    # supertask_id: Mapped[UUID | None] = mapped_column(
    #    PG_UUID(as_uuid=True), ForeignKey("supertasks.id"), default=None, nullable=True
    # )
    status: Mapped[Status] = mapped_column(
        SAENUM(
            Status, name="status", values_callable=lambda obj: [e.value for e in obj]
        ),
        default=Status.NOT_STARTED,
        nullable=True,
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
    primary_skill: Mapped[Skills] = mapped_column(
        task_skills_enum,
        nullable=False,
    )
    secondary_skills: Mapped[list[Skills]] = mapped_column(
        ARRAY(task_skills_enum),
        nullable=False,
        default=list,
    )
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=True,
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=True,
    )
