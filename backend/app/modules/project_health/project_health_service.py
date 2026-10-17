"""
services.py  -> app/modules/project_health/services.py

ONE orchestrator for the Project Health score. Diagnostic and READ-ONLY: it never
recommends or triggers an action (spec 8.3), and it writes nothing, takes no lock and
does not commit.

It loads the project's members and tasks, converts them into the pure dataclasses from
project_health_math, and calls compute_project_health(). No score is computed here; all
math lives in project_health_math.py / workload_math.py.

Import rule (same as project_snapshots/services.py): this module imports ONLY the two pure
math modules and ProjectMemberService at the top. Anything that could import back into
its neighbours (task, assignment, snapshot services, models) is imported lazily inside the
function.

Lines marked  # ASSUMPTION  depend on your schema; adjust the names.
"""
from __future__ import annotations

from dataclasses import asdict
from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Any, Awaitable, Callable, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.project_members.services import ProjectMemberService
from app.modules.project_health import project_health_math as hm
from app.modules.redistribution_recommendations import workload_math as wm

# Eligibility rule (3.1): how many members could take this task? (db, task, members) -> int
EligibleCounter = Callable[[AsyncSession, Any, list], Awaitable[int]]
# Fallback rule (3.3): share (0-1) of overloaded members' tasks with no eligible recipient.
RecipientRateFn = Callable[[AsyncSession, UUID, list], Awaitable[Optional[Decimal]]]

# SUBMITTED means the student is done and it is waiting on review. True = it counts as
# completed for schedule metrics. Set False to leave it as open work.
SUBMITTED_COUNTS_AS_DONE = True


# --------------------------------------------------------------------------- #
# Mapping: your models -> the pure dataclasses
# --------------------------------------------------------------------------- #
def to_schedule_state(status) -> hm.ScheduleState:
    """Works with an Enum (uses .name) or a plain string, any casing.
    Anything unknown (cancelled, archived ...) -> EXCLUDED, i.e. ignored everywhere."""
    key = str(getattr(status, "name", status)).strip().upper().replace(" ", "_").replace("-", "_")
    mapping = {
        "NOT_STARTED": hm.ScheduleState.NOT_STARTED,
        "IN_PROGRESS": hm.ScheduleState.IN_PROGRESS,
        "COMPLETED": hm.ScheduleState.COMPLETED,
        "SUBMITTED": hm.ScheduleState.COMPLETED if SUBMITTED_COUNTS_AS_DONE else hm.ScheduleState.IN_PROGRESS,
    }
    return mapping.get(key, hm.ScheduleState.EXCLUDED)


def _last_activity(task):
    """Prefer a dedicated last_activity_at (bumped only by real work), else updated_at."""
    return getattr(task, "last_activity_at", None) or getattr(task, "updated_at", None)  # ASSUMPTION


async def _load_health_tasks(
    db: AsyncSession,
    project_id: UUID,
    members: list,
    eligible_counter: Optional[EligibleCounter],
) -> list[hm.HealthTask]:
    """Read every task of the project and convert it to a pure HealthTask."""
    from app.modules.assigned_members.services import AssignedMemberService  # lazy
    from app.modules.tasks.services import TaskService                       # lazy

    # ASSUMPTION: returns ALL tasks of the project, every status (unlike get_eligible_tasks,
    # which only returns not-started / in-progress ones).
    tasks = await TaskService.get_all_project_tasks(db, project_id)

    # A parent (supertask) has subtasks tracked separately, so it must not be counted too.
    parent_ids = set()
    for t in tasks:
        pid = getattr(t, "parent_task_id", None)  # ASSUMPTION
        if pid is not None:
            parent_ids.add(pid)

    out: list[hm.HealthTask] = []
    for t in tasks:
        state = to_schedule_state(t.status)  # ASSUMPTION: attribute is called `status`
        is_parent = t.id in parent_ids
        is_open = state in (hm.ScheduleState.NOT_STARTED, hm.ScheduleState.IN_PROGRESS)

        assigned = True
        eligible: Optional[int] = None
        if is_open and not is_parent:
            # Same joint-table lookup the workload code uses. One query per open task;
            # swap in a batch method if this gets slow.
            assigned = bool(await AssignedMemberService.get_task_members(db, t.id))
            if eligible_counter is not None:
                eligible = await eligible_counter(db, t, members)

        out.append(hm.HealthTask(
            state=state,
            complexity_points=int(t.complexity_points or 0),
            deadline=t.deadline,
            completed_at=getattr(t, "completed_at", None),               # ASSUMPTION: new field
            updated_at=_last_activity(t),
            assigned=assigned,
            extension_count=int(getattr(t, "extension_count", 0) or 0),  # ASSUMPTION: or count Move Deadline applications
            eligible_member_count=eligible,
            is_parent=is_parent,
        ))
    return out


# --------------------------------------------------------------------------- #
# Member snapshots (read once, used for both the chronic flags and the balance)
# --------------------------------------------------------------------------- #
async def _load_member_snapshots(db: AsyncSession, members: list) -> dict:
    """member id -> latest member snapshot (None when a member has none yet)."""
    from app.modules.member_snapshots.services import MemberSnapshotService  # lazy

    return {pm.id: await MemberSnapshotService.get_latest_snapshot(db, pm.id) for pm in members}


def _member_flags(snaps: dict) -> tuple[int, bool]:
    """(chronic overload member count, is any chronic-overload escalation active)."""
    chronic = 0
    escalation_active = False
    for snap in snaps.values():
        if snap is None:
            continue
        if bool(getattr(snap, "is_chronic", False)):  # ASSUMPTION: where is_chronic lives
            chronic += 1
            # ASSUMPTION: however you record "this chronic member has been escalated"
            if bool(getattr(snap, "escalation_active", False)):
                escalation_active = True
    return chronic, escalation_active


def _flag_from_status(status) -> wm.Flag:
    """MemberStatus (or its string) -> Flag. Names match, so this is a lookup by name."""
    key = str(getattr(status, "name", status)).strip().upper()
    return wm.Flag.__members__.get(key, wm.Flag.NORMAL)


def _stored_workload_balance(snaps: dict, cfg: Optional[wm.WorkloadConfig]) -> wm.WorkloadBalance:
    """
    READ-ONLY workload balance: rebuilt from what the last recalculation saved on each
    member snapshot (total_effective_points, expected_points, workload_status), so nothing
    is recomputed, written or locked. Its freshness is that of the last recalculation.
    Members with no usable snapshot are skipped. The baseline is the median of the stored
    points, which is how workload_math defines it. Nobody usable -> balance is N/A.
    """
    results: list[wm.MemberResult] = []
    for member_id, snap in snaps.items():
        if snap is None:
            continue
        raw_points = getattr(snap, "total_effective_points", None)  # ASSUMPTION: snapshot field names
        raw_expected = getattr(snap, "expected_points", None)       # ASSUMPTION
        if raw_points is None or raw_expected is None:
            continue
        points = wm.to_decimal(raw_points)
        expected = wm.to_decimal(raw_expected)
        results.append(wm.MemberResult(
            member_id=member_id,
            total_effective_points=points,
            capacity_multiplier=wm.to_decimal(getattr(snap, "capacity_multiplier", None), default=wm.D1),
            expected_load=expected,
            status=_flag_from_status(getattr(snap, "workload_status", None)),  # true status, even when silenced
            silence_warning=bool(getattr(snap, "silence_warning", False)),
            load_ratio=wm.compute_load_ratio(points, expected),
        ))
    baseline = wm.compute_baseline([r.total_effective_points for r in results])
    return wm.compute_workload_balance(results, cfg, baseline_points=baseline)


# --------------------------------------------------------------------------- #
# Serialisation (for the API response)
# --------------------------------------------------------------------------- #
def _jsonable(value):
    if isinstance(value, Enum):
        return value.value
    if isinstance(value, Decimal):
        return str(value)  # string keeps exact precision; parse on the client
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, dict):
        return {str(k): _jsonable(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_jsonable(v) for v in value]
    return value


def health_to_dict(health: hm.ProjectHealth) -> dict:
    """JSON-safe dict of the whole result: headline, four sub-scores and every metric."""
    return _jsonable(asdict(health))


# --------------------------------------------------------------------------- #
# Service
# --------------------------------------------------------------------------- #
class ProjectHealthService:
    @staticmethod
    async def calculate_project_health(
        db: AsyncSession,
        project_id: UUID,
        *,
        today: date | None = None,
        workload: wm.ProjectWorkload | None = None,
        workload_config: wm.WorkloadConfig | None = None,
        health_config: hm.HealthConfig | None = None,
        eligible_counter: EligibleCounter | None = None,
        recipient_rate_fn: RecipientRateFn | None = None,
    ) -> hm.ProjectHealth:
        """
        Compute the project health score. READ-ONLY: no writes, no lock, no commit.

        Workload balance: by default it is rebuilt from each member's latest stored snapshot,
        i.e. whatever the last recalculation saved. If you need it fresher, call
        ProjectSnapshotService.calculate_project_workload yourself first (that one writes
        and takes the per-project lock) and pass its result in as `workload`.
        workload_config only matters for the balance settings (cutoff, weights, small-team
        rule); stored member statuses were already classified when they were saved.

        eligible_counter / recipient_rate_fn: hooks for eligibility rule 3.1 and fallback
        rule 3.3. Left as None, the single-point-of-failure rate is N/A (no penalty) and the
        no-eligible-recipient rate is not shown.
        """
        from app.modules.project_snapshots.services import app_today  # lazy

        today = today or app_today()
        cfg = health_config or hm.HealthConfig()

        members = await ProjectMemberService.get_elligible_members(db, project_id)
        snaps = await _load_member_snapshots(db, members)

        # 1. Workload balance sub-score.
        balance = workload.balance if workload is not None else _stored_workload_balance(snaps, workload_config)

        # 2. Inputs for the other three sub-scores.
        chronic_count, escalation_active = _member_flags(snaps)
        tasks = await _load_health_tasks(db, project_id, members, eligible_counter)

        recipient_rate = None
        if recipient_rate_fn is not None:
            recipient_rate = await recipient_rate_fn(db, project_id, members)

        # 3. Pure pass.
        return hm.compute_project_health(
            tasks=tasks,
            today=today,
            balance=balance,
            chronic_overload_count=chronic_count,
            chronic_escalation_active=escalation_active,
            no_eligible_recipient_rate=recipient_rate,
            cfg=cfg,
        )