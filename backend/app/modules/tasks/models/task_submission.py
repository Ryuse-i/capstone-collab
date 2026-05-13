from datetime import datetime, timezone
from app.core.db import Base
from sqlalchemy.orm import Mapped, mapped_column
from uuid import UUID, uuid4
from sqlalchemy import DateTime, ForeignKey, UUID as PG_UUID
from sqlalchemy import Enum as SAENUM
from app.modules.tasks.models.enums import Result

"""
    This is the submission history of each task
"""


class TaskSubmission(Base):
    __tablename__ = "task_submissions"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    task_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("tasks.id")
    )
    result: Mapped[Result] = mapped_column(
        SAENUM(Result, name="result"), default=None, nullable=True
    )
    comment: Mapped[str] = mapped_column(nullable=True)
    submitted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=True,
    )
