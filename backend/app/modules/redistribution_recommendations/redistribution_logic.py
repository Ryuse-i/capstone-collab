"""
Redistribution logic for PSU-COLLAB's Workload Monitor.
Implements eligibility, redistribution mechanics, and impact scoring on top of the existing workload calculation.
"""

import math
from datetime import date, timedelta
from typing import List, Dict, Any, Optional, Tuple
from uuid import UUID
from decimal import Decimal
from app.modules.project_snapshots.services import (
    ProjectSnapshotService, is_counted_member, app_today, task_state_from_status,
)

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.redistribution_recommendations import workload_math as wm
from app.modules.project_snapshots.services import ProjectSnapshotService, is_counted_member
from app.modules.tasks.model import Task
from app.modules.tasks.enums import Status as TaskStatus
from app.modules.project_members.model import ProjectMember, Skills
from app.modules.projects.model import Project
from app.modules.projects.services import ProjectService
from app.modules.project_members.services import ProjectMemberService
from app.modules.assigned_members.services import AssignedMemberService
from app.modules.member_snapshots.model import MemberSnapshot
from app.modules.tasks.services import TaskService


HALF = Decimal("0.5")

def _task_effective(task: Task, today: date) -> Decimal:
    """Effective points of the whole task, using the same rules as the service."""
    return wm.effective_points(
        wm.TaskInput(
            state=task_state_from_status(task.status),
            complexity_points=wm.complexity_to_points(task.complexity),
            deadline=task.deadline,
            effort_share=None,
            is_parent=False,
        ),
        today,
    )



def _is_eligible_for_task(member: ProjectMember, task: Task) -> bool:
    """
    Check if a member is eligible for a task based on:
    1. Possessing the task's primary skill (required).
    2. Possessing at least 75% of the task's secondary skills (rounded up).
    """
    # Check primary skill
    # member.skills is now a list of Skills
    member_skill_set = set(member.skills) if member.skills else set()
    if task.primary_skill not in member_skill_set:
        return False

    # If there are no secondary skills, the condition is vacuously true
    if not task.secondary_skills:
        return True

    # Count how many of the task's secondary skills are in the member's skills
    matched_secondaries = sum(1 for skill in task.secondary_skills if skill in member_skill_set)
    required_secondaries = math.ceil(len(task.secondary_skills) * 0.75)

    return matched_secondaries >= required_secondaries


async def _get_project_base_days_per_point(db: AsyncSession, project_id: UUID) -> int:
    """Get the base_days_per_point for a project."""
    project = await ProjectService.get_one_project(db, project_id)
    return project.base_days_per_point if project else 1


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
    # We define "most overloaded" as the member with the highest amount over expected_load
    # Only consider counted members (those that contribute to the baseline)
    counted_members = [m for m in project_workload.members if m.is_counted]
    overloaded_members = [m for m in counted_members if m.is_over_threshold and not m.warning_supressed]
    if not overloaded_members:
        return []
    most_overloaded_member = max(
        overloaded_members,
        key=lambda m: m.total_effective_points - m.expected_load,
    )

    overloaded_member_id = most_overloaded_member.member_id
    overloaded_member_total_effective = most_overloaded_member.total_effective_points
    overloaded_member_expected_load = most_overloaded_member.expected_load
    overloaded_member_capacity_multiplier = most_overloaded_member.capacity_multiplier

    # Compute overage ratio for display in Move Deadline options
    if overloaded_member_expected_load <= 0:
        overage_ratio = wm.MAX_OVERAGE_RATIO
    else:
        overage_ratio = min(
            max(overloaded_member_total_effective / overloaded_member_expected_load, Decimal("1")),
            wm.MAX_OVERAGE_RATIO,
        )

    # Step 3: Get the project's base_days_per_point
    base_days_per_point = await _get_project_base_days_per_point(db, project_id)

    # Step 4: Get the overloaded member's non-completed tasks
    assigned_members = await AssignedMemberService.get_members(db, overloaded_member_id)
    task_ids = [am.task_id for am in assigned_members if am.task_id is not None]
    if not task_ids:
        overloaded_member_tasks = []
    else:
        overloaded_member_tasks = await TaskService.batch_get_task(db, task_ids)
    # Filter out completed tasks
    overloaded_member_tasks = [
        task for task in overloaded_member_tasks
        if task_state_from_status(task.status) is not wm.TaskState.INACTIVE
    ]

    # Step 5: Get all members in the project (for eligibility checking)
    all_members = await ProjectMemberService.get_all_members_by_project(db, project_id)
    # Exclude the overloaded member from potential recipients, and only consider counted members
    potential_recipients = [
        m for m in all_members
        if m.id != overloaded_member_id and is_counted_member(m)
    ]

    # We'll collect all options here
    options = []

    # For each task of the overloaded member, generate options
    for task in overloaded_member_tasks:
        task_effective = _task_effective(task, today)
        task_complexity_points = wm.complexity_to_points(task.complexity)
        per_point = task_effective / Decimal(task_complexity_points) if task_complexity_points else Decimal("0")

        # Check eligibility of each potential recipient for this task
        eligible_recipients = [
            member for member in potential_recipients
            if _is_eligible_for_task(member, task)
        ]

        if not eligible_recipients:
            # No eligible recipient for this task: generate a Move Deadline option (required fallback)
            extension_days = wm.extension_days(
                task_complexity_points,
                base_days_per_point,
                overloaded_member_total_effective,
                overloaded_member_expected_load
            )
            options.append({
                "type": "Move Deadline",
                "task_id": task.id,
                "original_member_id": overloaded_member_id,
                "recipient_member_id": None,
                "impact": None,  # Not scored
                "details": {
                    "extension_days": extension_days,
                    "overage_ratio": overage_ratio,
                    "current_deadline": task.deadline.isoformat() if task.deadline else None,
                    "new_deadline": (task.deadline + timedelta(days=extension_days)).isoformat() if task.deadline else None,
                    "rationale": f"No eligible recipient found for task '{task.name}'. Deadline extension is the only option."
                }
            })
            continue

        # For each eligible recipient, generate Move, Share, and Split options
        for recipient in eligible_recipients:
            # Get recipient's current workload state from the project_workload we already computed
            recipient_data = next(
                (m for m in project_workload.members if m.member_id == recipient.id),
                None
            )
            if recipient_data is None:
                # Should not happen, but skip if we can't find the recipient's data
                continue

            recipient_total_effective = recipient_data.total_effective_points
            recipient_expected_load = recipient_data.expected_load

            # ========== Move Option ==========
            # Full task moves to recipient
            overloaded_after_move = overloaded_member_total_effective - task_effective
            recipient_after_move = recipient_total_effective + task_effective
            impact_move = wm.impact_score(
                overloaded_member_total_effective,
                overloaded_member_expected_load,
                task_effective,
                recipient_after_move,
                recipient_expected_load
            )
            if impact_move >= 0:  # Only include non-negative impact
                options.append({
                    "type": "Move",
                    "task_id": task.id,
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
            # Split the task 50/50 between original member and recipient
            shared_points = task_effective * HALF
            overloaded_after_share = overloaded_member_total_effective - shared_points
            recipient_after_share = recipient_total_effective + shared_points
            impact_share = wm.impact_score(
                overloaded_member_total_effective,
                overloaded_member_expected_load,
                shared_points,
                recipient_after_share,
                recipient_expected_load
            )
            if impact_share >= 0:
                options.append({
                    "type": "Share",
                    "task_id": task.id,
                    "original_member_id": overloaded_member_id,
                    "recipient_member_id": recipient.id,
                    "impact": impact_share,
                    "details": {
                        "points_shared": shared_points,
                        "effort_share": HALF,
                        "overloaded_before": overloaded_member_total_effective,
                        "overloaded_after": overloaded_after_share,
                        "recipient_before": recipient_total_effective,
                        "recipient_after": recipient_after_share,
                        "recipient_expected_load": recipient_expected_load
                    }
                })

            # ========== Split Option ==========
            # Split the task into two subtasks (as equal as possible in complexity points)
            # We only split if the task has at least 2 complexity points
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
                    options.append({
                        "type": "Split",
                        "task_id": task.id,
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


    # Step 6: Exclude options with negative impact (we already did during generation, but double-check)
    options = [opt for opt in options if opt["impact"] is None or opt["impact"] >= 0]

    # Step 7: Rank the scored options (Move, Share, Split) by impact descending
    # Move Deadline options have impact None and will be placed at the end
    scored_options = [opt for opt in options if opt["impact"] is not None]
    unscored_options = [opt for opt in options if opt["impact"] is None]  # Move Deadline

    scored_options.sort(key=lambda x: x["impact"], reverse=True)
    ranked_options = scored_options + unscored_options

    return ranked_options