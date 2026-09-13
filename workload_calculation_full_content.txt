"""
Workload calculation logic for PSU-COLLAB.

This module implements the core workload calculation logic as specified:
- effective_points(task) with deadline-weighted urgency multipliers
- Member aggregates (total_points, total_effective_points)
- baseline_points as median across members
- expected_load and overload determination
- Minimum deadline validation
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
from app.modules.member_snapshots.model import MemberSnapshot
from app.modules.assigned_members.model import AssignedMember
from app.modules.projects.model import Project
from app.modules.assigned_members.services import AssignedMemberService
from app.modules.tasks.services import TaskService
from app.modules.projects.services import ProjectService
from app.modules.project_members.services import ProjectMemberService

logger = logging.getLogger(__name__)


def complexity_to_points(complexity: Optional[Complexity]) -> int:
    """Convert complexity enum to points: Low=1, Medium=2, High=3."""
    if complexity is None:
        return 0
    mapping = {
        Complexity.LOW: 1,
        Complexity.MEDIUM: 2,
        Complexity.HIGH: 3
    }
    return mapping.get(complexity, 0)


def calculate_urgency_multiplier(task_deadline: Optional[date]) -> float:
    """
    Calculate urgency multiplier based on days until deadline.

    Returns:
        1.5 for overdue or <= 3 days
        1.25 for <= 7 days
        1.0 for <= 14 days
        0.75 for > 14 days
        1.0 for no deadline (treated as 14-day bucket)
    """
    if task_deadline is None:
        # No deadline -> treated as 14-day bucket (not low-pressure)
        return 1.0

    today = date.today()
    days_until = (task_deadline - today).days

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
    Calculate effective points for a task based on status and deadline urgency.

    Rules:
    - Not Started: complexity_points * urgency_multiplier
    - In Progress: complexity_points * 1.0 (no urgency scaling)
    - Completed: excluded (returns 0)
    """
    if task.status == TaskStatus.COMPLETED:
        return 0.0

    complexity_points = complexity_to_points(task.complexity)

    if task.status == TaskStatus.IN_PROGRESS:
        # In progress tasks don't get urgency scaling
        urgency_multiplier = 1.0
    else:  # NOT_STARTED
        urgency_multiplier = calculate_urgency_multiplier(task.deadline)

    return complexity_points * urgency_multiplier


async def get_member_tasks(db: AsyncSession, member_id: UUID) -> List[Task]:
    """
    Get all non-completed tasks assigned to a member.
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
    Calculate total_points (raw) and total_effective_points (weighted) for a member.

    Returns:
        (total_points, total_effective_points)
    """
    tasks = await get_member_tasks(db, member_id)

    total_points = 0.0
    total_effective_points = 0.0

    for task in tasks:
        # Skip completed tasks for both totals (as per spec)
        if task.status == TaskStatus.COMPLETED:
            continue

        complexity_points = complexity_to_points(task.complexity)
        total_points += complexity_points
        total_effective_points += calculate_effective_points(task)

    return total_points, total_effective_points


async def recompute_workload_state(
    db: AsyncSession,
    project_id: UUID
) -> List[dict]:
    """
    Recompute workload state for all members in a project.

    This is the main calculation service that:
    1. Computes effective_points per task
    2. Sums per member -> total_points and total_effective_points
    3. Computes baseline_points as median across members
    4. Computes expected_load per member
    5. Determines is_overloaded per member

    Returns list of member workload data dictionaries ready for snapshot creation/updating.
    """
    # Get all members in the project
    members = await ProjectMemberService.get_all_members_by_project(db, project_id)

    if not members:
        return []

    # Get the project for deadline validation constants
    project = await ProjectService.get_one_project(db, project_id)
    base_days_per_point = project.base_days_per_point if project else 1

    # Step 1-2: Calculate per-member totals
    member_data = []
    effective_points_list = []

    for member in members:
        total_points, total_effective_points = await calculate_member_workload_totals(
            db, member.member_id
        )

        member_data.append({
            "member_id": member.member_id,
            "total_points": total_points,
            "total_effective_points": total_effective_points,
            "member_obj": member  # Keep reference for later
        })
        effective_points_list.append(total_effective_points)

    # Step 3: Calculate baseline as median
    if effective_points_list:
        baseline_points = median(effective_points_list)
        # Handle even/odd case - statistics.median already does this correctly
    else:
        baseline_points = 0.0

    # Step 4-5: Calculate expected load and overload status
    results = []
    for data in member_data:
        # Get capacity multiplier from latest snapshot or default to 1.0
        latest_snapshot = await get_latest_member_snapshot(db, data["member_id"])
        capacity_multiplier = float(latest_snapshot.capacity_multiplier) if latest_snapshot else 1.0

        # Clamp capacity multiplier to valid range (0, 2.0]
        capacity_multiplier = max(0.01, min(capacity_multiplier, 2.0))

        expected_load = baseline_points * capacity_multiplier
        is_overloaded = data["total_effective_points"] > expected_load

        results.append({
            "member_id": data["member_id"],
            "total_points": data["total_points"],
            "total_effective_points": data["total_effective_points"],
            "expected_load": expected_load,
            "is_overloaded": is_overloaded,
            "capacity_multiplier": capacity_multiplier
        })

    return results


async def get_latest_member_snapshot(
    db: AsyncSession,
    member_id: UUID
) -> Optional[MemberSnapshot]:
    """Get the most recent snapshot for a member."""
    result = await db.execute(
        select(MemberSnapshot)
        .where(MemberSnapshot.member_id == member_id)
        .order_by(MemberSnapshot.snapshot_date.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def validate_task_deadline(
    task: Task,
    project_base_days_per_point: int = 1
) -> Tuple[bool, Optional[str]]:
    """
    Validate that a task's deadline meets the minimum required lead time.

    Returns:
        (is_valid, error_message)
    """
    if task.status == TaskStatus.COMPLETED:
        # Completed tasks don't need deadline validation
        return True, None

    if task.deadline is None:
        # No deadline set - this is allowed (treated as 14-day bucket for urgency)
        return True, None

    complexity_points = complexity_to_points(task.complexity)
    min_days_required = complexity_points * project_base_days_per_point

    if min_days_required <= 0:
        # No minimum required for 0 complexity points
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


async def create_or_update_member_snapshots(
    db: AsyncSession,
    project_id: UUID
) -> List[MemberSnapshot]:
    """
    Calculate workload state and create/update member snapshots for a project.

    This is the main entry point that combines calculation with persistence.
    """
    # Calculate workload state for all members
    workload_data = await recompute_workload_state(db, project_id)

    snapshots = []
    for data in workload_data:
        # Try to get existing snapshot for today
        today = date.today()
        existing_snapshot = await db.execute(
            select(MemberSnapshot)
            .where(
                MemberSnapshot.member_id == data["member_id"],
                MemberSnapshot.snapshot_date == today
            )
        )
        snapshot = existing_snapshot.scalar_one_or_none()

        if snapshot:
            # Update existing snapshot
            snapshot.total_effective_points = data["total_effective_points"]
            snapshot.capacity_multiplier = data["capacity_multiplier"]
            # Update workload status based on overload calculation
            if data["is_overloaded"]:
                snapshot.workload_status = "overloaded"
            elif snapshot.total_effective_points < (data["expected_load"] / 2.0):
                snapshot.workload_status = "underutilized"
            else:
                snapshot.workload_status = "normal"
        else:
            # Create new snapshot
            # Determine workload status
            if data["is_overloaded"]:
                workload_status = "overloaded"
            elif data["total_effective_points"] < (data["expected_load"] / 2.0):
                workload_status = "underutilized"
            else:
                workload_status = "normal"

            snapshot = MemberSnapshot(
                member_id=data["member_id"],
                snapshot_date=today,
                total_effective_points=data["total_effective_points"],
                capacity_multiplier=data["capacity_multiplier"],
                workload_status=workload_status,
                silence_warning=False,
                consecutive_fallback_count=0
            )
            db.add(snapshot)

        snapshots.append(snapshot)

    await db.commit()

    # Refresh to get IDs and timestamps
    for snapshot in snapshots:
        await db.refresh(snapshot)

    return snapshots