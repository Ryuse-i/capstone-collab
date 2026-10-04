from datetime import datetime, timezone
from uuid import UUID, uuid4
from sqlalchemy import DateTime, ForeignKey, String, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.core.db import Base


class StoredFile(Base):
    __tablename__ = "files"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    key: Mapped[str] = mapped_column(String(300), unique=True)  # path in the bucket
    filename: Mapped[str] = mapped_column(String(255))  # original name
    size: Mapped[int]
    content_type: Mapped[str] = mapped_column(String(100))
    uploaded_by: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )