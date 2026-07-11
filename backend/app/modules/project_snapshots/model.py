from decimal import Decimal
from sqlalchemy import ForeignKey, Numeric, Date
from app.core.db import Base
from sqlalchemy.orm import mapped_column, Mapped, relationship
from uuid import UUID
from sqlalchemy import UUID as PG_UUID
from sqlalchemy import Enum as SAENUM
from datetime import date
from typing import TYPE_CHECKING
import enum

if TYPE_CHECKING:
    from app.modules.projects.model import Project


class Severity(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class Status(str, enum.Enum):
    GOOD = "good"
    WARNING = "warning"
    BAD = "bad"


class ProjectSnapshot(Base):
    __tablename__ = "project_snapshots"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=True,
    )
    total_workload_points: Mapped[int] = mapped_column(default=0)
    avg_workload: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    progress_score: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    progress_percentage: Mapped[int] = mapped_column(default=0)
    expected_score: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    expected_percentage: Mapped[int] = mapped_column(default=0)
    schedule_variance: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    workload_balance: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=True)
    imbalance_severity: Mapped[Severity] = mapped_column(
        SAENUM(Severity, name="severity"), default=Severity.LOW
    )
    health_score: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    health_status: Mapped[Status] = mapped_column(
        SAENUM(Status, name="health_status", create_type=True)
    )

    # Inverse relationship pointing back to Project
    project: Mapped["Project"] = relationship("Project", back_populates="snapshot")

    snapshot_date: Mapped[date] = mapped_column(
        Date,
        default=date.today()
    )
