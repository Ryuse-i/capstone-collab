from datetime import datetime
from app.core.db import Base
from sqlalchemy.orm import Mapped, mapped_column
from uuid import UUID, uuid4
from sqlalchemy import DateTime, ForeignKey, Numeric, String, UUID as PG_UUID
import enum
from sqlalchemy import Enum as SAENUM


class Status(enum.Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    SUBMITTED = "submitted"
    COMPLETED = "completed"
    NONE = "none"


class Complexity(enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    NONE = "none"


class Category(enum.Enum):
    DOCUMENT = "document"
    RESEARCH = "research"
    DEVELOPMENT = "development"
    NONE = "none"


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    name: Mapped[str] = mapped_column(String(150))
    created_by: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    project_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("projects.id"), nullable=True
    )
    supertask_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("supertasks.id"), nullable=True
    )
    status: Mapped[Status] = mapped_column(
        SAENUM(Status, name="status"), default=Status.NONE, nullable=True
    )
    complexity: Mapped[Complexity] = mapped_column(
        SAENUM(Complexity, name="complexity"), default=Complexity.NONE, nullable=True
    )
    complexity_points: Mapped[int] = mapped_column(nullable=True)
    category: Mapped[Category] = mapped_column(
        SAENUM(Category, name="category"), default=Category.NONE, nullable=True
    )
    deadline: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
