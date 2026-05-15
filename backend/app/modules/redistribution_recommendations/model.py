from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import (
    UUID as PG_UUID,
    ForeignKey,
    Integer,
    Text,
    Enum as SAENUM,
    DateTime,
)
from app.core.db import Base
from uuid import UUID
from datetime import datetime, timezone
import enum


class Type(str, enum.Enum):
    SHARE = "share"
    SPLIT = "split"
    TRANSFER = "transfer"
    RESCHEDULE = "reschedule"


class RedistributionRecommendation(Base):
    __tablename__ = "redistribution_recommendations"

    id: Mapped[int] = mapped_column(primary_key=True)
    detail: Mapped[str] = mapped_column(Text)
    project_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("projects.id")
    )
    suggestion_type: Mapped[Type] = mapped_column(SAENUM(Type, name="type"))
    rank: Mapped[int] = mapped_column(Integer)
    expected_workload_after: Mapped[str] = mapped_column(Text)
    deadline_impact: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
