from datetime import datetime, timezone
from app.core.db import Base
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import ForeignKey, String, UUID
import uuid


class Project(Base):
    __tablename__ = "projects"

    # Changed id to UUID to stay consistent, or keep as int if you prefer
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(150))
    description: Mapped[str]

    # Changed these from int to UUID
    created_by: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"),
        nullable=True,
    )
    advisor: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=True)
    instructor: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
