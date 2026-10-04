from datetime import datetime, timezone
from typing import TYPE_CHECKING
from uuid import UUID, uuid4
from sqlalchemy import DateTime, ForeignKey, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.db import Base

if TYPE_CHECKING:
    from app.modules.tasks.model import Task
    from app.modules.files.model import StoredFile


class TaskAttachment(Base):
    __tablename__ = "task_attachments"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    task_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE")
    )
    file_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("files.id", ondelete="CASCADE")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    task: Mapped["Task"] = relationship("Task", back_populates="attachments")
    file: Mapped["StoredFile"] = relationship("StoredFile")