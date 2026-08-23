from datetime import date
from app.core.db import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship
from uuid import UUID
from sqlalchemy import (
    Boolean,
    Date,
    ForeignKey,
    UUID as PG_UUID,
    Integer,
    Numeric,
    UniqueConstraint,
)
from sqlalchemy import Enum as SAENUM
from decimal import Decimal
import enum
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.modules.project_members.model import ProjectMember


"""
    This is the member snapshot where most 
    of the data about status and other things about the members
"""


class MemberStatus(str, enum.Enum):
    NORMAL = "normal"
    UNDERUTILIZED = "underutilized"
    OVERLOADED = "overloaded"


class MemberSnapshot(Base):
    __tablename__ = "member_snapshots"

    id: Mapped[int] = mapped_column(primary_key=True)
    member_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("project_members.id", ondelete="CASCADE")
    )

    # Relationships
    member: Mapped["ProjectMember"] = relationship(
        "ProjectMember",
        back_populates="snapshots",
        foreign_keys=[member_id],
    )

    # Deadline weighted sum, this is the actual workload of member
    total_effective_points: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0.0)
    # adjusts personal expected load base on the baseline
    capacity_multiplier: Mapped[Decimal] = mapped_column(Numeric(3, 2), default=1.0)
    # hides overload warning
    silence_warning: Mapped[bool] = mapped_column(Boolean, default=False)
    consecutive_fallback_count: Mapped[int] = mapped_column(Integer, default=0)
    workload_status: Mapped[MemberStatus] = mapped_column(
        SAENUM(MemberStatus, name="member_status"), default=MemberStatus.NORMAL
    )

    snapshot_date: Mapped[date] = mapped_column(Date, default=date.today)

    __table_args__ = (
        UniqueConstraint("member_id", "snapshot_date", name="uq_member_snapshot_date"),
    )
