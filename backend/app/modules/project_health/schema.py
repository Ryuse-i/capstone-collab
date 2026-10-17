"""
schema.py  -> app/modules/project_health/schema.py

Response models for the Project Health score. Read-only, so there is no upsert or request
schema: nothing is stored.

They are built straight from the dataclasses in project_health_math / workload_math
(from_attributes), field for field. If you add a field to one of those dataclasses, add it
here too, otherwise it will silently be left out of the API response.

None means N/A (for example the balance when everyone's work is done). Show "N/A", not 0.
"""
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from .project_health_math import HealthStatus


class _FromDataclass(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class WorkloadBalanceResponse(_FromDataclass):
    applicable: bool                     # False -> every score below is None (N/A)
    spread_used: bool                    # False for small teams: spread is shown but not scored
    score: Decimal | None
    spread_score: Decimal | None
    overload_score: Decimal | None
    severity_score: Decimal | None
    median_ratio: Decimal
    mad: Decimal
    total_members: int
    overloaded_count: int                # excludes silence_warning members
    overloaded_pct: Decimal              # 0-1
    max_load_ratio: Decimal
    max_load_member_id: UUID | None
    underutilized_member_ids: list[UUID]


class ScheduleMetricsResponse(_FromDataclass):
    applicable: bool                     # False when the project has no live tasks
    score: Decimal | None
    open_tasks: int
    overdue_tasks: int
    overdue_rate: Decimal                # 0-1
    at_risk_tasks: int
    at_risk_rate: Decimal                # 0-1
    total_points: Decimal
    completed_points: Decimal
    remaining_points: Decimal
    completion_pct: Decimal | None       # 0-100, points-weighted
    planned_points: Decimal
    earned_points: Decimal
    spi: Decimal | None                  # None when nothing was planned yet
    extension_count: int


class RiskMetricsResponse(_FromDataclass):
    score: Decimal
    chronic_count: int
    open_tasks: int
    unassigned_count: int
    unassigned_rate: Decimal             # 0-1
    spof_count: int
    spof_rate: Decimal | None            # None = not computed (needs the eligibility rule)
    no_eligible_recipient_rate: Decimal | None


class ActivityMetricsResponse(_FromDataclass):
    applicable: bool                     # False when nothing is In Progress
    score: Decimal | None
    in_progress_tasks: int
    stale_in_progress: int
    recent_completions: int


class ProjectHealthResponse(_FromDataclass):
    score: Decimal | None                # headline 0-100
    status: HealthStatus                 # after override rules
    base_status: HealthStatus            # from the score alone
    overrides_applied: list[str]         # which rules made the status worse
    # Always show these next to the headline number. None = N/A.
    schedule_score: Decimal | None
    workload_balance_score: Decimal | None
    risk_score: Decimal | None
    activity_score: Decimal | None
    weights_used: dict[str, Decimal]     # after renormalising over the components that apply
    schedule: ScheduleMetricsResponse
    risk: RiskMetricsResponse
    activity: ActivityMetricsResponse
    balance: WorkloadBalanceResponse