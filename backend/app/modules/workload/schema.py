"""app/modules/workload_balance/schema.py"""
from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel

from app.modules.project_snapshots.model import Severity  # ASSUMPTION: LOW / MEDIUM / HIGH


class WorkloadBalanceResponse(BaseModel):
    """Full breakdown, mirrors workload_math.WorkloadBalance plus the mapped severity.
    When applicable is False every score is None -> UI shows "N/A"."""
    applicable: bool
    spread_used: bool
    score: Decimal | None = None
    spread_score: Decimal | None = None
    overload_score: Decimal | None = None
    severity_score: Decimal | None = None
    median_ratio: Decimal
    mad: Decimal
    total_members: int
    overloaded_count: int
    overloaded_pct: Decimal
    max_load_ratio: Decimal
    max_load_member_id: UUID | None = None
    underutilized_member_ids: list[UUID] = []
    imbalance_severity: Severity


class WorkloadBalanceSummary(BaseModel):
    """What is persisted on the project snapshot (cheap read, no recompute)."""
    project_id: UUID
    workload_balance: Decimal | None = None
    imbalance_severity: Severity
    snapshot_date: date