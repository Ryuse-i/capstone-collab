from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import (
    UUID as PG_UUID,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    Date,
    Enum as SAENUM,
    DateTime,
)
from app.core.db import Base
from uuid import UUID
from decimal import Decimal
from datetime import date, datetime, timezone
import enum
from sqlalchemy.dialects.postgresql import JSONB


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
        PG_UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE")
    )
    suggestion_type: Mapped[Type] = mapped_column(SAENUM(Type, name="type"))
    rank: Mapped[int] = mapped_column(Integer)
    expected_workload_after: Mapped[str] = mapped_column(Text)
    deadline_impact: Mapped[str] = mapped_column(Text)

    # --- References used by the "Go" button (all nullable) -----------------
    # SET NULL so a recommendation survives if its task/member is deleted;
    # the frontend disables Go when task_id is null.
    task_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("tasks.id", ondelete="SET NULL"),
        nullable=True,
    )
    from_member_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("project_members.id", ondelete="SET NULL"),
        nullable=True,
    )
    # Null for "reschedule" (no recipient).
    to_member_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("project_members.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Display names captured at generation time (same moment as `detail`),
    # so the UI needs no extra lookups and stays consistent with the text.
    task_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    from_member_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    to_member_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # --- Type-specific data ------------------------------------------------
    # reschedule: deadline the engine assumed, and the one it suggests.
    # current_deadline is also stored for other types, to detect stale advice.
    current_deadline: Mapped[date | None] = mapped_column(Date, nullable=True)
    suggested_deadline: Mapped[date | None] = mapped_column(Date, nullable=True)
    extension_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # transfer / share / split: effective points that move off the donor.
    points_moved: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    # split only: complexity points the recipient takes.
    recipient_points: Mapped[int | None] = mapped_column(Integer, nullable=True)
    split: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )