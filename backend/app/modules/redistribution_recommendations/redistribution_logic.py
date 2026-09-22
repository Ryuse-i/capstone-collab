"""
Redistribution logic for PSU-COLLAB's Workload Monitor.
Implements eligibility, redistribution mechanics, and impact scoring on top of the existing workload calculation.
"""

import math
from datetime import date, timedelta
from typing import List, Dict, Any, Optional, Tuple
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.redistribution_recommendations.workload_calculation import (
    recompute_workload_state,
    complexity_to_points,
    calculate_urgency_multiplier,
    calculate_effective_points,
    get_member_tasks,
    is_working_member
)
from app.modules.tasks.model import Task
from app.modules.tasks.enums import Status as TaskStatus
from app.modules.project_members.model import ProjectMember, Skills
from app.modules.projects.model import Project
from app.modules.projects.services import ProjectService
from app.modules.project_members.services import ProjectMemberService
from app.modules.assigned_members.services import AssignedMemberService
from app.modules.member_snapshots.model import MemberSnapshot


def _get_urgency_multiplier_for_task(task: Task) -> float:
    """Get the urgency multiplier for a task based on its status and deadline."""
    if task.status == TaskStatus.COMPLETED:
        return 0.0  # Completed tasks have zero effective points, but we won't consider them for redistribution
    if task.status == TaskStatus.IN_PROGRESS:
        return 1.0
    else:  # NOT_STARTED
        return calculate_urgency_multiplier(task.deadline)


def _get_task_effective_points(task: Task) -> float:
    """Get the effective points of a task (same as in workload_calculation)."""
    if task.status == TaskStatus.COMPLETED:
        return 0.0
    complexity_points = complexity_to_points(task.complexity)
    if task.status == TaskStatus.IN_PROGRESS:
        return complexity_points * 1.0
    else:  # NOT_STARTED
        return complexity_points * calculate_urgency_multiplier(task.deadline)


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
    # Step 1: Recompute workload state for the project
    workload_data = await recompute_workload_state(db, project_id)
    if not workload_data:
        return []

    # Step 2: Identify the single most overloaded member
    # We define "most overloaded" as the member with the highest amount over expected_load
    overloaded_rows = [m for m in workload_data if m["is_overloaded"]]
    if not overloaded_rows:
        return []
    most_overloaded_member = max(
        overloaded_rows,
        key=lambda m: m["total_effective_points"] - m["expected_load"],
    )

    overloaded_member_id = most_overloaded_member["member_id"]
    overloaded_member_total_effective = most_overloaded_member["total_effective_points"]
    overloaded_member_expected_load = most_overloaded_member["expected_load"]
    overloaded_member_capacity_multiplier = most_overloaded_member["capacity_multiplier"]

    # Step 3: Get the project's base_days_per_point
    base_days_per_point = await _get_project_base_days_per_point(db, project_id)

    # Step 4: Get the overloaded member's non-completed tasks
    overloaded_member_tasks = await get_member_tasks(db, overloaded_member_id)
    # Filter out completed tasks (should already be filtered by get_member_tasks, but double-check)
    overloaded_member_tasks = [
        task for task in overloaded_member_tasks
        if task.status != TaskStatus.COMPLETED
    ]

    # Step 5: Get all members in the project (for eligibility checking)
    all_members = await ProjectMemberService.get_all_members_by_project(db, project_id)
    # Exclude the overloaded member from potential recipients, and only consider working members
    potential_recipients = [
        m for m in all_members
        if m.id != overloaded_member_id and is_working_member(m)
    ]

    # We'll collect all options here
    options = []

    # For each task of the overloaded member, generate options
    for task in overloaded_member_tasks:
        task_effective = _get_task_effective_points(task)
        task_complexity_points = complexity_to_points(task.complexity)
        urgency_multiplier = _get_urgency_multiplier_for_task(task)

        # Check eligibility of each potential recipient for this task
        eligible_recipients = [
            member for member in potential_recipients
            if _is_eligible_for_task(member, task)
        ]

        if not eligible_recipients:
            # No eligible recipient for this task: generate a Move Deadline option (required fallback)
            overage_ratio = overloaded_member_total_effective / overloaded_member_expected_load
            extension_days = math.ceil(task_complexity_points * base_days_per_point * overage_ratio)
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
            # Get recipient's current workload state from the workload_data we already computed
            recipient_data = next(
                (md for md in workload_data if md["member_id"] == recipient.id),
                None
            )
            if recipient_data is None:
                # Should not happen, but skip if we can't find the recipient's data
                continue

            recipient_total_effective = recipient_data["total_effective_points"]
            recipient_expected_load = recipient_data["expected_load"]

            # ========== Move Option ==========
            # Full task moves to recipient
            overloaded_after_move = overloaded_member_total_effective - task_effective
            recipient_after_move = recipient_total_effective + task_effective
            impact_move = (
                (overloaded_member_total_effective - overloaded_after_move) -
                max(0, recipient_after_move - recipient_expected_load)
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
            shared_points = task_effective * 0.5
            overloaded_after_share = overloaded_member_total_effective - shared_points
            recipient_after_share = recipient_total_effective + shared_points
            impact_share = (
                (overloaded_member_total_effective - overloaded_after_share) -
                max(0, recipient_after_share - recipient_expected_load)
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
                        "effort_share": 0.5,
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
                # Split complexity points into two integers that sum to the original and are as close as possible
                p1 = task_complexity_points // 2
                p2 = task_complexity_points - p1
                # Calculate effective points for each subtask
                if task.status == TaskStatus.IN_PROGRESS:
                    eff1 = p1 * 1.0
                    eff2 = p2 * 1.0
                else:  # NOT_STARTED
                    eff1 = p1 * urgency_multiplier
                    eff2 = p2 * urgency_multiplier

                # We have two ways to assign the subtasks:
                # Way A: original member gets subtask1 (eff1), recipient gets subtask2 (eff2)
                # Way B: original member gets subtask2 (eff2), recipient gets subtask1 (eff1)
                # We'll choose the way that gives the better impact (higher impact) for this recipient

                # Way A
                overloaded_after_a = overloaded_member_total_effective - eff1
                recipient_after_a = recipient_total_effective + eff2
                impact_a = (
                    (overloaded_member_total_effective - overloaded_after_a) -
                    max(0, recipient_after_a - recipient_expected_load)
                )

                # Way B
                overloaded_after_b = overloaded_member_total_effective - eff2
                recipient_after_b = recipient_total_effective + eff1
                impact_b = (
                    (overloaded_member_total_effective - overloaded_after_b) -
                    max(0, recipient_after_b - recipient_expected_load)
                )

                # Choose the better impact
                if impact_a >= impact_b:
                    chosen_impact = impact_a
                    chosen_way = "A"
                    overloaded_after = overloaded_after_a
                    recipient_after = recipient_after_a
                    eff_original_loses = eff1
                    eff_recipient_gets = eff2
                else:
                    chosen_impact = impact_b
                    chosen_way = "B"
                    overloaded_after = overloaded_after_b
                    recipient_after = recipient_after_b
                    eff_original_loses = eff2
                    eff_recipient_gets = eff1

                if chosen_impact >= 0:
                    options.append({
                        "type": "Split",
                        "task_id": task.id,
                        "original_member_id": overloaded_member_id,
                        "recipient_member_id": recipient.id,
                        "impact": chosen_impact,
                        "details": {
                            "subtask1_points": p1,
                            "subtask2_points": p2,
                            "subtask1_effective": eff1,
                            "subtask2_effective": eff2,
                            "way": chosen_way,
                            "overloaded_before": overloaded_member_total_effective,
                            "overloaded_after": overloaded_after,
                            "recipient_before": recipient_total_effective,
                            "recipient_after": recipient_after,
                            "recipient_expected_load": recipient_expected_load
                        }
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