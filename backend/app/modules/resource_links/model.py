from datetime import datetime, timezone
from typing import TYPE_CHECKING
from uuid import UUID, uuid4
from sqlalchemy import DateTime, ForeignKey, String, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.db import Base

if TYPE_CHECKING:
    from app.modules.resources.model import Resource
    from app.modules.users.model import User


class ResourceLink(Base):
    __tablename__ = "resource_links"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    resource_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("resources.id", ondelete="CASCADE")
    )
    created_by: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    url: Mapped[str] = mapped_column(String(2048))
    title: Mapped[str | None] = mapped_column(String(150), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=True,
    )

    resource: Mapped["Resource"] = relationship("Resource", back_populates="links")
    creator: Mapped["User | None"] = relationship("User")