from uuid import UUID
from pydantic import BaseModel
from datetime import datetime
from decimal import Decimal
from .model import Severity, Status


class ProjectSnapshotCreate(BaseModel):
    project_id: UUID
    total_workload_points: int
    avg_workload: int
    progress_score: Decimal
    progress_percentage: int
    expected_score: Decimal
    expected_percentage: int
    schedule_variance: Decimal
    workload_balance: Decimal | None = None
    imbalance_severity: Severity
    health_score: Decimal
    health_status: Status


class ProjectSnapshotUpdate(BaseModel):
    project_id: UUID | None = None
    total_workload_points: int | None = None
    avg_workload: int | None = None
    progress_score: Decimal | None = None
    progress_percentage: int | None = None
    expected_score: Decimal | None = None
    expected_percentage: int | None = None
    schedule_variance: Decimal | None = None
    workload_balance: Decimal | None = None
    imbalance_severity: Severity | None = None
    health_score: Decimal | None = None
    health_status: Status | None = None


class ProjectSnapshotResponse(BaseModel):
    id: int
    project_id: UUID
    total_workload_points: int
    avg_workload: int
    progress_score: Decimal
    progress_percentage: int
    expected_score: Decimal
    expected_percentage: int
    schedule_variance: Decimal
    workload_balance: Decimal | None = None
    imbalance_severity: Severity
    health_score: Decimal
    health_status: Status
    created_at: datetime | None = None
    updated_at: datetime | None = None
