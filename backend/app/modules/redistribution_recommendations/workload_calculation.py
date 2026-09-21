"""
Workload calculation logic for PSU-COLLAB.

This module is the SINGLE place where workload math and workload decisions live.
Services (e.g. MemberSnapshotService) should only read from / write to the
database and call the functions here; they should not compute their own
medians, multipliers or overload/underutilized checks.

What this module implements (see the Workload Monitor spec):
- effective_points(task): complexity points scaled by a deadline-urgency multiplier
- Member aggregates: total_points (raw, dashboard only) and
  total_effective_points (weighted, drives overload)
- baseline_points: the MEDIAN of all members' total_effective_points
- expected_load = baseline_points * capacity_multiplier
- Overload / underutilized status per member
- Minimum deadline validation (complexity_points * base_days_per_point)

Layout of this file:
    1. Task-level calculations        (complexity, urgency, effective points)
    2. Member-level calculations      (totals, status, single-member state)
    3. Project-level calculation      (recompute_workload_state)
    4. Validation                     (minimum deadline)
    5. Persistence helper             (create_or_update_member_snapshots)
"""

from typing import List, Tuple, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from statistics import median
from uuid import UUID
from datetime import date, timezone
import logging

from app.modules.tasks.model import Task
from app.modules.tasks.enums import Status as TaskStatus, Complexity
from app.modules.project_members.model import ProjectMember
from app.modules.member_snapshots.model import MemberSnapshot, MemberStatus
from app.modules.assigned_members.model import AssignedMember
from app.modules.projects.model import Project
from app.modules.assigned_members.services import AssignedMemberService
from app.modules.tasks.services import TaskService
from app.modules.projects.services import ProjectService
from app.modules.project_members.services import ProjectMemberService

logger = logging.getLogger(__name__)

# A member is UNDERUTILIZED when their load is below this fraction of expected_load.
UNDERUTILIZED_FRACTION = 0.5


# =========================================================================== #
# 1. Task-level calculations
# =========================================================================== #

def complexity_to_points(complexity: Optional[Complexity]) -> int:
    """
    Convert a task's complexity enum into raw points.

    Low = 1, Medium = 2, High = 3. A task with no complexity (None) is worth 0
    points, so it adds nothing to anyone's workload and has no minimum deadline.
    """
    if complexity is None:
        return 0
    mapping = {
        Complexity.LOW: 1,
        Complexity.MEDIUM: 2,
        Complexity.HIGH: 3,
    }
    return mapping.get(complexity, 0)


def calculate_urgency_multiplier(task_deadline: Optional[date]) -> float:
    """
    Return the urgency multiplier for a deadline, based on days remaining.

    The closer (or more overdue) the deadline, the more a task weighs:
        overdue or <= 3 days -> 1.5
        <= 7 days            -> 1.25
        <= 14 days           -> 1.0
        > 14 days            -> 0.75
        no deadline          -> 1.0  (treated as the 14-day bucket, so a task
                                      without a deadline is not seen as low-pressure)

    Note: "today" is the server's local date (date.today()). This is a known
    issue on the bug list, since users in another timezone can see off-by-one
    buckets around midnight.
    """
    if task_deadline is None:
        return 1.0

    today = date.today()
    days_until = (task_deadline - today).days

    # Overdue tasks have a NEGATIVE days_until, so the first branch (<= 3)
    # also covers them; there is no separate overdue check.
    if days_until <= 3:
        return 1.5
    elif days_until <= 7:
        return 1.25
    elif days_until <= 14:
        return 1.0
    else:
        return 0.75


def calculate_effective_points(task: Task) -> float:
    """
    Calculate the effective (weighted) points for a single task.

    Rules, by status:
    - NOT_STARTED: complexity_points * urgency_multiplier
    - IN_PROGRESS: complexity_points * 1.0. Once work has started, the deadline
      no longer inflates the weight, otherwise a member would look MORE
      overloaded for starting a task.
    - SUBMITTED:   0. The member has finished their part and is waiting for
      review. If the submission is rejected the task returns to IN_PROGRESS
      and counts again.
    - COMPLETED:   0.

    A task with no status is treated like NOT_STARTED.
    """
    if task.status in (TaskStatus.COMPLETED, TaskStatus.SUBMITTED):
        return 0.0

    complexity_points = complexity_to_points(task.complexity)

    if task.status == TaskStatus.IN_PROGRESS:
        urgency_multiplier = 1.0
    else:  # NOT_STARTED (or no status)
        urgency_multiplier = calculate_urgency_multiplier(task.deadline)

    return complexity_points * urgency_multiplier


# =========================================================================== #
# 2. Member-level calculations
# =========================================================================== #

async def get_member_tasks(db: AsyncSession, member_id: UUID) -> List[Task]:
    """
    Load every task assigned to a member.

    IMPORTANT: despite what older comments say, this does NOT filter by status.
    It returns COMPLETED and SUBMITTED tasks too. Callers that only want active
    work must filter them out (calculate_member_workload_totals does).
    """
    assigned_members = await AssignedMemberService.get_members(db, member_id)
    task_ids = [am.task_id for am in assigned_members if am.task_id is not None]

    if not task_ids:
        return []

    return await TaskService.batch_get_task(db, task_ids)


async def calculate_member_workload_totals(
    db: AsyncSession,
    member_id: UUID
) -> Tuple[float, float]:
    """
    Calculate one member's workload totals from their assigned tasks.

    Returns (total_points, total_effective_points):
    - total_points:            raw complexity points. Shown on the dashboard only.
    - total_effective_points:  urgency-weighted points. This is what drives the
                               overload check.

    COMPLETED and SUBMITTED tasks are excluded from BOTH totals.
    """
    tasks = await get_member_tasks(db, member_id)

    total_points = 0.0
    total_effective_points = 0.0

    for task in tasks:
        # Finished / awaiting-review tasks count as zero in both totals.
        if task.status in (TaskStatus.COMPLETED, TaskStatus.SUBMITTED):
            continue

        total_points += complexity_to_points(task.complexity)
        total_effective_points += calculate_effective_points(task)

    return total_points, total_effective_points


def determine_workload_status(
    total_effective_points: float,
    expected_load: float
) -> MemberStatus:
    """
    Decide a member's workload status from their load and expected load.

    This is the ONE definition of "overloaded" / "underutilized". Every caller
    (snapshots, dashboard, redistribution engine) should use it so the flags
    can never disagree.

    - OVERLOADED:    load is strictly ABOVE expected_load (equal is NOT overloaded)
    - UNDERUTILIZED: load is below half of expected_load
    - NORMAL:        anything in between

    Edge case: when expected_load is 0 (e.g. most members have no tasks, so the
    median is 0), any member with points is OVERLOADED and a member with none is
    NORMAL, because 0 is not below 0 / 2.
    """
    if total_effective_points > expected_load:
        return MemberStatus.OVERLOADED
    if total_effective_points < expected_load * UNDERUTILIZED_FRACTION:
        return MemberStatus.UNDERUTILIZED
    return MemberStatus.NORMAL


async def calculate_member_workload_state(
    db: AsyncSession,
    member_id: UUID
) -> Optional[dict]:
    """
    Calculate the full workload state of ONE member.

    A member's state can't be computed in isolation: the baseline is the median
    of the WHOLE project, so this recomputes the member's project and returns
    just that member's row.

    Returns the same dictionary shape as recompute_workload_state rows
    (member_id, total_points, total_effective_points, expected_load,
    is_overloaded, capacity_multiplier, workload_status), or None if the member
    doesn't exist or isn't found in their project.

    Cost: this loads every member's tasks in the project. When refreshing a whole
    project, call recompute_workload_state ONCE instead of calling this per member.
    """
    member = await ProjectMemberService.get_one_member(db, member_id)
    if member is None:
        return None

    project_state = await recompute_workload_state(db, member.project_id)
    for row in project_state:
        if row["member_id"] == member_id:
            return row
    return None


# =========================================================================== #
# 3. Project-level calculation
# =========================================================================== #

async def get_latest_member_snapshot(
    db: AsyncSession,
    member_id: UUID
) -> Optional[MemberSnapshot]:
    """
    Return the member's most recent snapshot row (any date), or None.

    Used to read the member's persisted settings (capacity_multiplier), which
    live on the snapshot row and carry across days.
    """
    result = await db.execute(
        select(MemberSnapshot)
        .where(MemberSnapshot.member_id == member_id)
        .order_by(MemberSnapshot.snapshot_date.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def recompute_workload_state(
    db: AsyncSession,
    project_id: UUID
) -> List[dict]:
    """
    Recompute the workload state of every member in a project.

    Steps:
    1. Compute each member's total_points and total_effective_points.
    2. baseline_points = MEDIAN of all members' total_effective_points.
       (Median, not mean, so one very overloaded member doesn't drag the
       baseline up and hide themselves.)
    3. expected_load = baseline_points * the member's capacity_multiplier.
    4. Determine is_overloaded and workload_status per member.

    This function only READS; it doesn't write to the database. Use
    create_or_update_member_snapshots to persist the result.

    Returns one dictionary per member:
        member_id, total_points, total_effective_points, expected_load,
        is_overloaded, capacity_multiplier, workload_status
    Returns [] when the project has no members.

    Known issue (bug 8): the median currently includes ADVISOR and INSTRUCTOR
    members, who always have 0 points, which pulls the baseline down. Only
    LEADER and MEMBER (project_role None = MEMBER) should count.
    """
    members = await ProjectMemberService.get_all_members_by_project(db, project_id)

    if not members:
        return []

    # NOTE: base_days_per_point is currently unused in this function. It is left
    # in place because deadline validation moved to task create/update.
    project = await ProjectService.get_one_project(db, project_id)
    base_days_per_point = project.base_days_per_point if project else 1

    # Step 1: per-member totals
    member_data = []
    effective_points_list = []

    for member in members:
        total_points, total_effective_points = await calculate_member_workload_totals(
            db, member.id
        )

        member_data.append({
            "member_id": member.id,
            "total_points": total_points,
            "total_effective_points": total_effective_points,
        })
        effective_points_list.append(total_effective_points)

    # Step 2: baseline. statistics.median sorts internally and averages the two
    # middle values for an even count, so no manual sorting is needed.
    baseline_points = median(effective_points_list) if effective_points_list else 0.0

    # Steps 3-4: expected load and status per member
    results = []
    for data in member_data:
        # capacity_multiplier is a per-member setting stored on the snapshot row.
        # No snapshot yet -> default 1.0 (member is expected to carry the baseline).
        latest_snapshot = await get_latest_member_snapshot(db, data["member_id"])
        capacity_multiplier = (
            float(latest_snapshot.capacity_multiplier) if latest_snapshot else 1.0
        )

        # Clamp to (0, 2.0]. The minimum is 0.01, not 0, because a multiplier of
        # 0 would make expected_load 0 and flag everyone with any work as overloaded.
        capacity_multiplier = max(0.01, min(capacity_multiplier, 2.0))

        expected_load = baseline_points * capacity_multiplier

        # Overload is judged on EFFECTIVE points (urgency-weighted), never raw.
        results.append({
            "member_id": data["member_id"],
            "total_points": data["total_points"],
            "total_effective_points": data["total_effective_points"],
            "expected_load": expected_load,
            "is_overloaded": data["total_effective_points"] > expected_load,
            "capacity_multiplier": capacity_multiplier,
            "workload_status": determine_workload_status(
                data["total_effective_points"], expected_load
            ),
        })

    return results


# =========================================================================== #
# 4. Validation
# =========================================================================== #

async def validate_task_deadline(
    task: Task,
    project_base_days_per_point: int = 1
) -> Tuple[bool, Optional[str]]:
    """
    Check that a task's deadline leaves enough lead time for its size.

    Minimum lead time = complexity_points * project_base_days_per_point days.
    Example: a HIGH task (3 points) in a project with 2 days/point needs a
    deadline at least 6 days from today.

    Returns (is_valid, error_message); the message is None when valid.

    Deadlines are not checked (always valid) when:
    - the task is COMPLETED (only COMPLETED is skipped; SUBMITTED tasks are still checked),
    - the task has no deadline,
    - the task has 0 complexity points (no minimum applies).

    This function does no I/O; it is async only so existing callers can keep
    awaiting it.
    """
    if task.status == TaskStatus.COMPLETED:
        return True, None

    if task.deadline is None:
        return True, None

    complexity_points = complexity_to_points(task.complexity)
    min_days_required = complexity_points * project_base_days_per_point

    if min_days_required <= 0:
        return True, None

    today = date.today()
    days_until_deadline = (task.deadline - today).days

    if days_until_deadline < min_days_required:
        return False, (
            f"Task deadline must be at least {min_days_required} day(s) from today "
            f"(based on {complexity_points} complexity points × {project_base_days_per_point} base days/point). "
            f"Got {days_until_deadline} day(s)."
        )

    return True, None


# =========================================================================== #
# 5. Persistence helper
# =========================================================================== #

async def create_or_update_member_snapshots(
    db: AsyncSession,
    project_id: UUID
) -> List[MemberSnapshot]:
    """
    Recompute a project's workload and save one snapshot row per member for today.

    Snapshots are one row per member per day (unique member_id + snapshot_date):
    - If today's row exists, its totals, capacity_multiplier and status are updated.
    - Otherwise a new row is created for today.

    Commits the transaction and returns the saved snapshots.

    Known issue (bug 5): when a NEW day's row is created, silence_warning and
    consecutive_fallback_count are reset to False / 0, and they should carry over
    from the previous row instead.
    """
    workload_data = await recompute_workload_state(db, project_id)

    today = date.today()
    snapshots = []
    for data in workload_data:
        existing_snapshot = await db.execute(
            select(MemberSnapshot)
            .where(
                MemberSnapshot.member_id == data["member_id"],
                MemberSnapshot.snapshot_date == today
            )
        )
        snapshot = existing_snapshot.scalar_one_or_none()

        if snapshot:
            snapshot.total_effective_points = data["total_effective_points"]
            snapshot.capacity_multiplier = data["capacity_multiplier"]
            snapshot.workload_status = data["workload_status"]
        else:
            snapshot = MemberSnapshot(
                member_id=data["member_id"],
                snapshot_date=today,
                total_effective_points=data["total_effective_points"],
                capacity_multiplier=data["capacity_multiplier"],
                workload_status=data["workload_status"],
                silence_warning=False,
                consecutive_fallback_count=0
            )
            db.add(snapshot)

        snapshots.append(snapshot)

    await db.commit()

    # Refresh so the returned objects have their generated IDs and timestamps.
    for snapshot in snapshots:
        await db.refresh(snapshot)

    return snapshots