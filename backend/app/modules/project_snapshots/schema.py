from uuid import UUID
from pydantic import BaseModel
from datetime import date
from decimal import Decimal
from .model import Severity, Status


class ProjectSnapshotUpsert(BaseModel):
    total_workload_points: int | None = None
    avg_workload: Decimal | None = None
    progress_score: Decimal | None = None
    progress_percentage: int | None = None
    expected_score: Decimal | None = None
    expected_percentage: int | None = None
    schedule_variance: Decimal | None = None
    workload_balance: Decimal | None = None
    imbalance_severity: Severity | None = None
    health_score: Decimal | None = None
    health_status: Status | None = None
    unassigned_tasks: int | None = None


class ProjectSnapshotResponse(BaseModel):
    id: int
    project_id: UUID
    total_workload_points: int
    avg_workload: Decimal
    progress_score: Decimal
    progress_percentage: int
    expected_score: Decimal
    expected_percentage: int
    schedule_variance: Decimal
    workload_balance: Decimal | None = None
    imbalance_severity: Severity
    health_score: Decimal
    health_status: Status
    unassigned_tasks: int
    snapshot_date: date
