"""
Redistribution logic for PSU-COLLAB's Workload Monitor.
Implements eligibility, redistribution mechanics, and impact scoring on top of the existing workload calculation.
"""

import math
import logging
from datetime import date, timedelta
from typing import List, Dict, Any, Optional, Tuple
from uuid import UUID
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.redistribution_recommendations import workload_math as wm
from app.modules.project_snapshots.services import (
    ProjectSnapshotService,
    is_counted_member,
    app_today,
)
from app.modules.tasks.model import Task
from app.modules.tasks.enums import Status as TaskStatus
from app.modules.project_members.model import ProjectMember, Skills
from app.modules.projects.model import Project
from app.modules.projects.services import ProjectService
from app.modules.project_members.services import ProjectMemberService
from app.modules.assigned_members.services import AssignedMemberService
from app.modules.member_snapshots.model import MemberSnapshot
from app.modules.tasks.services import TaskService

logger = logging.getLogger(__name__)

HALF = Decimal("0.5")


# --------------------------------------------------------------------------- #
# Status mapping (TaskStatus -> wm.TaskState)
# --------------------------------------------------------------------------- #
def _to_task_state(status) -> wm.TaskState:
    """
    Map the app's task status enum onto the pure-math TaskState.

    wm.effective_points compares with `is wm.TaskState.X`, so passing the app's own
    enum straight in makes every task fall through as "in progress" (no urgency
    scaling, and completed tasks counted at full points). Matching on the normalised
    name/value keeps this working whatever the enum members are called.
    Anything that is not clearly Not Started / In Progress is INACTIVE (excluded).
    """
    for candidate in (getattr(status, "name", None), getattr(status, "value", status)):
        if candidate is None:
            continue
        key = str(candidate).strip().lower().replace(" ", "_").replace("-", "_")
        if key == "not_started":
            return wm.TaskState.NOT_STARTED
        if key == "in_progress":
            return wm.TaskState.IN_PROGRESS
    return wm.TaskState.INACTIVE


async def _get_task_assignee_ids(db: AsyncSession, task_id: UUID, fallback_member_id: UUID) -> List[UUID]:
    """
    Member ids currently assigned to a task. The task's points are split equally
    between them (effort_share = 1 / number of assignees), same as the workload calculation.

    >>> WIRE THIS UP: point it at the same query the workload calculation uses to count
    >>> a task's assignees. It tries a few likely AssignedMemberService method names; if
    >>> none exist it logs a warning and assumes the donor is the only assignee.
    """
    for method_name in ("get_members_by_task", "get_by_task", "get_assigned_members_by_task"):
        method = getattr(AssignedMemberService, method_name, None)
        if method is None:
            continue
        rows = await method(db, task_id)
        ids = [getattr(r, "member_id", None) for r in rows]
        ids = [i for i in ids if i is not None]
        if ids:
            return ids
        break
    logger.warning(
        "Could not load assignees for task %s; assuming a single assignee (full share).", task_id
    )
    return [fallback_member_id]


def _task_effective(task: Task, today: date, effort_share: Optional[Decimal] = None) -> Decimal:
    """
    Effective points of the task for the donor, using the same rules as the service.
    Returns 0 for completed / unknown-status tasks and for parent (super) tasks.
    """
    return wm.effective_points(
        wm.TaskInput(
            state=_to_task_state(task.status),
            complexity_points=wm.complexity_to_points(task.complexity),
            deadline=task.deadline,
            effort_share=effort_share,
            is_parent=bool(getattr(task, "is_parent", False)),
        ),
        today,
    )


# --------------------------------------------------------------------------- #
# Member-row helpers (tolerate either the wm.MemberResult names or the
# service wrapper names, so a rename on one side does not crash this file)
# --------------------------------------------------------------------------- #
def _member_is_counted(m) -> bool:
    return bool(getattr(m, "is_counted", True))


def _member_is_over_threshold(m) -> bool:
    value = getattr(m, "is_over_threshold", None)
    if value is not None:
        return bool(value)
    status = getattr(m, "status", None)
    return str(getattr(status, "name", status)).upper() == "OVERLOADED"


def _member_is_silenced(m) -> bool:
    if hasattr(m, "warning_supressed"):  # spelling as used by the service
        return bool(m.warning_supressed)
    return bool(getattr(m, "silence_warning", False))


def _member_display_name(member) -> str:
    user = member.user  # must be eager-loaded, see the note below
    name = f"{user.first_name} {user.last_name}".strip() if user else ""
    return name or str(member.id)[:8]


# --------------------------------------------------------------------------- #
# Eligibility
# --------------------------------------------------------------------------- #
def _is_eligible_for_task(member: ProjectMember, task: Task) -> bool:
    """
    Check if a member is eligible for a task based on:
    1. Possessing the task's primary skill (required).
    2. Possessing at least 75% of the task's secondary skills (rounded up).
    """
    member_skill_set = set(member.skills) if member.skills else set()
    if task.primary_skill not in member_skill_set:
        return False

    # If there are no secondary skills, the condition is vacuously true
    if not task.secondary_skills:
        return True

    matched_secondaries = sum(1 for skill in task.secondary_skills if skill in member_skill_set)
    required_secondaries = math.ceil(len(task.secondary_skills) * 0.75)

    return matched_secondaries >= required_secondaries


async def _get_project_base_days_per_point(db: AsyncSession, project_id: UUID) -> int:
    """Get the base_days_per_point for a project."""
    project = await ProjectService.get_one_project(db, project_id)
    return project.base_days_per_point if project else 1


def _move_deadline_option(
    task: Task,
    task_complexity_points: int,
    base_days_per_point: int,
    overloaded_member_id: UUID,
    overloaded_member_name: str,
    overloaded_member_total_effective: Decimal,
    overloaded_member_expected_load: Decimal,
    overage_ratio: Decimal,
    rationale: str,
    today: date,
) -> Dict[str, Any]:
    """Build a Move Deadline option (unscored, ranked last)."""
    # Workload-based extension (how much extra time the task needs)
    workload_ext_days = wm.extension_days(
        task_complexity_points,
        base_days_per_point,
        overloaded_member_total_effective,
        overloaded_member_expected_load,
    )
    current_deadline = task.deadline
    # Tolerate datetime columns
    if current_deadline is not None and hasattr(current_deadline, "date"):
        current_deadline = current_deadline.date()

    if current_deadline:
        # Extend from the later of (deadline, today) so the new deadline is never in the past
        anchor = max(current_deadline, today)
        new_deadline_date = anchor + timedelta(days=workload_ext_days)
        # Actual shift versus the old deadline (includes any overdue days)
        ext_days = (new_deadline_date - current_deadline).days
        overdue_days = max((today - current_deadline).days, 0)
        if overdue_days:
            rationale += (
                f" The task is already {overdue_days} day(s) overdue, so the "
                f"{workload_ext_days}-day extension is counted from today rather than the old deadline "
                f"(total shift of {ext_days} day(s) from the old deadline)."
            )
        new_deadline = new_deadline_date.isoformat()
    else:
        # No deadline: propose one relative to today
        ext_days = workload_ext_days
        new_deadline = (today + timedelta(days=workload_ext_days)).isoformat()
        rationale += (
            f" This task has no deadline set, so a deadline {workload_ext_days} day(s) "
            f"from today is suggested."
        )

    return {
        "type": "Move Deadline",
        "task_id": task.id,
        "original_member_id": overloaded_member_id,
        "original_member_name": overloaded_member_name,
        "recipient_member_id": None,
        "impact": None,  # Not scored
        "details": {
            "extension_days": ext_days,                    # real shift from the old deadline
            "workload_extension_days": workload_ext_days,  # extra time the workload calls for
            "overage_ratio": overage_ratio,
            "current_deadline": current_deadline.isoformat() if current_deadline else None,
            "new_deadline": new_deadline,
            "rationale": rationale,
        },
    }

async def generate_redistribution_options(
    db: AsyncSession,
    project_id: UUID
) -> List[Dict[str, Any]]:
    """
    Generate ranked redistribution options for the most overloaded member in a project.
    Returns a list of options, each being a dictionary representing a redistribution option.
    Options with negative impact are excluded. Move Deadline options are appended last.
    """
    # Step 1: Recompute workload state for the project using the new workload math
    today = app_today()
    project_workload = await ProjectSnapshotService.calculate_project_workload(db, project_id, today=today)
    if not project_workload.members:
        return []

    # Step 2: Identify the single most overloaded member
    # "Most overloaded" = highest amount over expected_load. Silenced members are never
    # the source of a recommendation, but can still receive tasks.
    counted_members = [m for m in project_workload.members if _member_is_counted(m)]
    overloaded_members = [
        m for m in counted_members
        if _member_is_over_threshold(m) and not _member_is_silenced(m)
    ]
    if not overloaded_members:
        return []
    most_overloaded_member = max(
        overloaded_members,
        key=lambda m: m.total_effective_points - m.expected_load,
    )

    overloaded_member_id = most_overloaded_member.member_id
    overloaded_member_total_effective = most_overloaded_member.total_effective_points
    overloaded_member_expected_load = most_overloaded_member.expected_load

    # Overage ratio for display in Move Deadline options (matches wm.extension_days clamping)
    if overloaded_member_expected_load <= 0:
        overage_ratio = wm.MAX_OVERAGE_RATIO
    else:
        overage_ratio = min(
            max(overloaded_member_total_effective / overloaded_member_expected_load, Decimal("1")),
            wm.MAX_OVERAGE_RATIO,
        )

    # Step 3: Get the project's base_days_per_point
    base_days_per_point = await _get_project_base_days_per_point(db, project_id)

    # Step 4: Get the overloaded member's tasks
    assigned_members = await AssignedMemberService.get_members(db, overloaded_member_id)
    task_ids = [am.task_id for am in assigned_members if am.task_id is not None]
    if not task_ids:
        overloaded_member_tasks = []
    else:
        overloaded_member_tasks = await TaskService.batch_get_task(db, task_ids)

    # Step 5: Get all members in the project (for eligibility checking)
    all_members = await ProjectMemberService.get_all_members_by_project(db, project_id)
    member_names = {m.id: _member_display_name(m) for m in all_members}
    overloaded_member_name = member_names.get(
        overloaded_member_id, str(overloaded_member_id)[:8]
    )
    # Exclude the overloaded member from potential recipients, and only consider counted members
    potential_recipients = [
        m for m in all_members
        if m.id != overloaded_member_id and is_counted_member(m)
    ]

    options: List[Dict[str, Any]] = []

    # For each task of the overloaded member, generate options
    for task in overloaded_member_tasks:
        # Completed / unknown-status / parent tasks come back as 0 and are skipped:
        # they add nothing to the donor's load, so moving them cannot help.
        # Equal split: each assignee carries 1 / (number of assignees) of the task.
        assignee_ids = await _get_task_assignee_ids(db, task.id, overloaded_member_id)
        n_assignees = len(assignee_ids)
        equal_share = Decimal(1) / Decimal(n_assignees)

        task_effective = _task_effective(task, today, equal_share)  # donor's slice
        if task_effective <= 0:
            continue
        full_task_effective = task_effective * n_assignees  # whole task, for the Share option

        task_complexity_points = wm.complexity_to_points(task.complexity)
        per_point = task_effective / Decimal(task_complexity_points) if task_complexity_points else Decimal("0")

        eligible_recipients = [
            member for member in potential_recipients
            if member.id not in assignee_ids  # already on this task
            and _is_eligible_for_task(member, task)
        ]

        if not eligible_recipients:
            # No eligible recipient for this task: Move Deadline is the required fallback (spec 3.3)
            options.append(_move_deadline_option(
                task, task_complexity_points, base_days_per_point,
                overloaded_member_id, overloaded_member_name, overloaded_member_total_effective,
                overloaded_member_expected_load, overage_ratio,
                rationale=f"No eligible recipient found for task '{task.name}'. Deadline extension is the only option.",
                today=today
            ))
            continue

        scored_for_this_task = 0

        # For each eligible recipient, generate Move, Share, and Split options
        for recipient in eligible_recipients:
            recipient_data = next(
                (m for m in project_workload.members if m.member_id == recipient.id),
                None
            )
            if recipient_data is None:
                continue

            recipient_total_effective = recipient_data.total_effective_points
            recipient_expected_load = recipient_data.expected_load

            # ========== Move Option ==========
            overloaded_after_move = overloaded_member_total_effective - task_effective
            recipient_after_move = recipient_total_effective + task_effective
            impact_move = wm.impact_score(
                overloaded_member_total_effective,
                overloaded_member_expected_load,
                task_effective,
                recipient_after_move,
                recipient_expected_load
            )
            if impact_move >= 0:
                scored_for_this_task += 1
                options.append({
                    "type": "Move",
                    "task_id": task.id,
                    "original_member_name": overloaded_member_name,
                    "recipient_member_name": member_names.get(recipient.id),
                    "original_member_id": overloaded_member_id,
                    "recipient_member_id": recipient.id,
                    "impact": impact_move,
                    "details": {
                        "points_moved": task_effective,
                        "overloaded_before": overloaded_member_total_effective,
                        "overloaded_after": overloaded_after_move,
                        "recipient_before": recipient_total_effective,
                        "recipient_after": recipient_after_move,
                        "recipient_expected_load": recipient_expected_load
                    }
                })

            # ========== Share Option ==========
            # Adding the recipient re-splits the task equally: everyone, including the donor,
            # drops from 1/n to 1/(n+1). With a single assignee this is the old 50/50.
            new_share = Decimal(1) / Decimal(n_assignees + 1)
            recipient_gain = full_task_effective * new_share
            shared_points = task_effective - recipient_gain  # donor's relief
            overloaded_after_share = overloaded_member_total_effective - shared_points
            recipient_after_share = recipient_total_effective + recipient_gain
            impact_share = wm.impact_score(
                overloaded_member_total_effective,
                overloaded_member_expected_load,
                shared_points,
                recipient_after_share,
                recipient_expected_load
            )
            if impact_share >= 0:
                scored_for_this_task += 1
                options.append({
                    "type": "Share",
                    "task_id": task.id,
                    "original_member_name": overloaded_member_name,
                    "recipient_member_name": member_names.get(recipient.id),
                    "original_member_id": overloaded_member_id,
                    "recipient_member_id": recipient.id,
                    "impact": impact_share,
                    "details": {
                        "points_shared": shared_points,
                        "effort_share": new_share,
                        "overloaded_before": overloaded_member_total_effective,
                        "overloaded_after": overloaded_after_share,
                        "recipient_before": recipient_total_effective,
                        "recipient_after": recipient_after_share,
                        "recipient_expected_load": recipient_expected_load
                    }
                })

            # ========== Split Option ==========
            # Only if the task has at least 2 complexity points
            if task_complexity_points >= 2:
                p1 = task_complexity_points // 2
                p2 = task_complexity_points - p1

                best = None
                # The recipient takes either the smaller or the larger half; the donor keeps the other.
                for recipient_points in (p1, p2):
                    moved_eff = per_point * recipient_points
                    donor_after = overloaded_member_total_effective - moved_eff
                    recipient_after = recipient_total_effective + moved_eff
                    impact = wm.impact_score(
                        overloaded_member_total_effective, overloaded_member_expected_load,
                        moved_eff, recipient_after, recipient_expected_load,
                    )
                    if best is None or impact > best["impact"]:
                        best = {
                            "impact": impact, "recipient_points": recipient_points,
                            "moved_eff": moved_eff, "donor_after": donor_after,
                            "recipient_after": recipient_after,
                        }

                if best["impact"] >= 0:
                    scored_for_this_task += 1
                    options.append({
                        "type": "Split",
                        "task_id": task.id,
                        "original_member_name": overloaded_member_name,
                        "recipient_member_name": member_names.get(recipient.id),
                        "original_member_id": overloaded_member_id,
                        "recipient_member_id": recipient.id,
                        "impact": best["impact"],
                        "details": {
                            "donor_keeps_points": task_complexity_points - best["recipient_points"],
                            "recipient_gets_points": best["recipient_points"],
                            "points_moved": best["moved_eff"],
                            "overloaded_before": overloaded_member_total_effective,
                            "overloaded_after": best["donor_after"],
                            "recipient_before": recipient_total_effective,
                            "recipient_after": best["recipient_after"],
                            "recipient_expected_load": recipient_expected_load,
                        },
                    })

        # Eligible recipients exist, but every Move/Share/Split would make things worse
        # (negative impact). Don't leave the task with no option: offer the time-relief
        # option instead (spec 4.4 / 5.3). It is ranked last.
        if scored_for_this_task == 0:
            options.append(_move_deadline_option(
                task, task_complexity_points, base_days_per_point,
                overloaded_member_id, overloaded_member_name, overloaded_member_total_effective,
                overloaded_member_expected_load, overage_ratio,
                rationale=(
                    f"Eligible recipients exist for task '{task.name}', but moving, sharing or "
                    f"splitting it would overload them. Extending the deadline relieves time pressure instead."
                ),
                today=today
            ))

    # Step 6: Rank the scored options (Move, Share, Split) by impact descending.
    # Move Deadline options have impact None and go at the end.
    scored_options = [opt for opt in options if opt["impact"] is not None]
    unscored_options = [opt for opt in options if opt["impact"] is None]

    scored_options.sort(key=lambda x: x["impact"], reverse=True)
    return scored_options + unscored_options