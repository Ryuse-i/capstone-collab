from datetime import date, datetime
from decimal import Decimal
from typing import List, Dict, Any, Optional, Tuple
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from .model import RedistributionRecommendation, Type
from .repo import RedisRecomRepo
from .schema import (
    RedisRecomCreate,
    RedisRecomUpdate,
)
from app.modules.redistribution_recommendations.redistribution_logic import generate_redistribution_options
from app.modules.project_members.services import ProjectMemberService
from app.modules.tasks.services import TaskService
from app.modules.ai.service import determine_task_category
from app.modules.project_members.model import Skills


# Engine option type -> database enum
TYPE_MAP = {
    "Move": Type.TRANSFER,
    "Share": Type.SHARE,
    "Split": Type.SPLIT,
    "Move Deadline": Type.RESCHEDULE,
}


def _fmt(value) -> str:
    try:
        return f"{Decimal(str(value)):.2f}"
    except Exception:
        return str(value)


def _to_date(value) -> Optional[date]:
    """Accept a date, datetime or ISO string; return a plain date (or None)."""
    if value is None or value == "":
        return None
    if isinstance(value, datetime):  # check first: datetime is a subclass of date
        return value.date()
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError:
        return None


def _member_label(member) -> str:
    """Display name for a project member (name comes from the related user)."""
    if member is None:
        return "Unknown member"
    user = getattr(member, "user", None)  # eager-loaded by get_all_members_by_project
    if user is not None:
        full_name = f"{user.first_name} {user.last_name}".strip()
        if full_name:
            return full_name
        if getattr(user, "email", None):
            return str(user.email)
    return f"member {str(member.id)[:8]}"


def _build_text(opt: Dict[str, Any], task, donor, recipient) -> Tuple[str, str, str]:
    """Return (detail, expected_workload_after, deadline_impact) for one option."""
    kind = opt["type"]
    d = opt["details"]
    task_name = getattr(task, "name", None) or "this task"
    donor_name = _member_label(donor)
    recipient_name = _member_label(recipient)

    if kind == "Move Deadline":
        days = d["extension_days"]
        detail = f"Extend the deadline of '{task_name}' ({donor_name}) by {days} day(s). {d['rationale']}"
        expected = "Workload points unchanged (time relief only)."
        if d["new_deadline"]:
            impact = f"Deadline moves from {d['current_deadline']} to {d['new_deadline']} (+{days} day(s))."
        else:
            impact = "No deadline is set on this task. Set one."
        return detail, expected, impact

    if kind == "Move":
        detail = f"Transfer '{task_name}' from {donor_name} to {recipient_name}."
    elif kind == "Share":
        pct = f"{float(d['effort_share']):.0%}"
        detail = (
            f"Add {recipient_name} to '{task_name}' so the work is split equally "
            f"(each member's share becomes {pct})."
        )
    else:  # Split
        detail = (
            f"Split '{task_name}': {recipient_name} takes '{d['recipient_part']['title']}' "
            f"({d['recipient_gets_points']} pt), {donor_name} keeps "
            f"'{d['donor_part']['title']}' ({d['donor_keeps_points']} pt)."
        )

    expected = (
        f"{donor_name}: {_fmt(d['overloaded_before'])} -> {_fmt(d['overloaded_after'])}; "
        f"{recipient_name}: {_fmt(d['recipient_before'])} -> {_fmt(d['recipient_after'])} "
        f"(expected load {_fmt(d['recipient_expected_load'])})."
    )
    return detail, expected, "No deadline change."


def _build_refs(opt: Dict[str, Any], task, donor, recipient) -> Dict[str, Any]:
    """
    Structured fields for the frontend (Go button, drawer pre-fill, stale checks).
    Everything here comes straight from the engine's option dict, nothing is parsed
    back out of the text.
    """
    d = opt["details"]
    recipient_id = opt["recipient_member_id"]  # None for Move Deadline

    # Move / Split report "points_moved"; Share reports "points_shared" (donor's relief).
    points = d.get("points_moved", d.get("points_shared"))

    split = None
    if opt["type"] == "Split":
        def _with_category(part: dict) -> dict:
            try:
                category = determine_task_category(Skills(part["primary_skill"])).value
            except ValueError:
                category = getattr(getattr(task, "category", None), "value", None)
            return {**part, "category": category}

        supertask_id = getattr(task, "supertask_id", None)
        split = {
            "task_name": getattr(task, "name", None),
            "priority": getattr(getattr(task, "priority", None), "value", None),
            "supertask_id": str(supertask_id) if supertask_id else None,
            "donor_part": _with_category(d["donor_part"]),
            "recipient_part": _with_category(d["recipient_part"]),
            "split_rationale": d["split_rationale"],
        } 


    return {
        "task_id": opt["task_id"],
        "task_name": getattr(task, "name", None),
        "from_member_id": opt["original_member_id"],
        "from_member_name": _member_label(donor),
        "to_member_id": recipient_id,
        "to_member_name": _member_label(recipient) if recipient_id is not None else None,
        # Only Move Deadline carries current_deadline in its details; for the other
        # types fall back to the task's own deadline so every row can be stale-checked.
        "current_deadline": _to_date(d.get("current_deadline"))
        or _to_date(getattr(task, "deadline", None)),
        "suggested_deadline": _to_date(d.get("new_deadline")),
        "extension_days": d.get("extension_days"),
        "points_moved": Decimal(str(points)) if points is not None else None,
        "recipient_points": d.get("recipient_gets_points"),
        "split": split
    }


class RecommendationService:
    """Unified service for redistribution recommendations."""

    @staticmethod
    async def get_one_recommendation(db: AsyncSession, recommendation_id: int):
        repo = RedisRecomRepo(db)
        return await repo.get_by_id(recommendation_id)

    @staticmethod
    async def get_all_recommendations(db: AsyncSession):
        repo = RedisRecomRepo(db)
        return await repo.get_all()

    @staticmethod
    async def get_project_recommendations(
        db: AsyncSession, project_id: UUID
    ) -> List[RedistributionRecommendation]:
        """Saved recommendations for one project, best first."""
        repo = RedisRecomRepo(db)
        return await repo.get_by_project(project_id)

    @staticmethod
    async def create_recommendation(db: AsyncSession, project: RedisRecomCreate):
        repo = RedisRecomRepo(db)
        return await repo.create(project)

    @staticmethod
    async def update_recommendation(
        db: AsyncSession, db_item: RedistributionRecommendation, project: RedisRecomUpdate
    ):
        repo = RedisRecomRepo(db)
        return await repo.update(db_item, project)

    @staticmethod
    async def delete_recommendation(db: AsyncSession, db_item: RedistributionRecommendation):
        repo = RedisRecomRepo(db)
        return await repo.delete(db_item)

    @staticmethod
    async def generate_redistribution_options(
        db: AsyncSession,
        project_id: UUID
    ) -> List[Dict[str, Any]]:
        """
        Preview only: returns the raw ranked options (dicts) without saving anything.
        Move Deadline options are always last.
        """
        return await generate_redistribution_options(db, project_id)

    @staticmethod
    async def generate_and_save_recommendations(
        db: AsyncSession,
        project_id: UUID
    ) -> List[RedistributionRecommendation]:
        """
        Main entry point for the feature.

        Recomputes the ranked options for the project's most overloaded member, REPLACES
        the project's previously saved recommendations (spec section 6: unapplied
        alternatives are stale once state changes), and saves the new ones with
        rank 1..n. Delete and insert happen in one transaction.
        """
        options = await generate_redistribution_options(db, project_id)

        # Look up names for the text fields
        task_ids = list({opt["task_id"] for opt in options})
        tasks = await TaskService.batch_get_task(db, task_ids) if task_ids else []
        task_by_id = {t.id: t for t in tasks}
        members = await ProjectMemberService.get_all_members_by_project(db, project_id)
        member_by_id = {m.id: m for m in members}

        payloads: List[RedisRecomCreate] = []
        for rank, opt in enumerate(options, start=1):
            task = task_by_id.get(opt["task_id"])
            donor = member_by_id.get(opt["original_member_id"])
            recipient = member_by_id.get(opt["recipient_member_id"])

            detail, expected_after, deadline_impact = _build_text(opt, task, donor, recipient)
            refs = _build_refs(opt, task, donor, recipient)

            payload = RedisRecomCreate(
                detail=detail,
                project_id=project_id,
                suggestion_type=TYPE_MAP[opt["type"]],
                rank=rank,
                expected_workload_after=expected_after,
                deadline_impact=deadline_impact,
                **refs,
            )
            payloads.append(payload)

        repo = RedisRecomRepo(db)
        return await repo.replace_for_project(project_id, payloads)