"""
repo.py  -> app/modules/dashboard/repo.py

Read-only queries for the instructor/advisor dashboard. Each method is ONE query for all of
the user's projects, so the dashboard never does per-project round trips (except health,
see service.py).
"""
from datetime import date
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.assigned_members.model import AssignedMember
from app.modules.assigned_reviewer.model import AssignedReviewer
from app.modules.project_members.model import ProjectMember
from app.modules.project_snapshots.model import ProjectSnapshot
from app.modules.tasks.enums import Status
from app.modules.tasks.model import Task


class DashboardRepo:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def latest_progress(self, project_ids: list[UUID]) -> dict[UUID, int]:
        """project_id -> progress_percentage of its newest snapshot (one query)."""
        if not project_ids:
            return {}
        stmt = (
            select(ProjectSnapshot)
            .where(ProjectSnapshot.project_id.in_(project_ids))
            .order_by(ProjectSnapshot.project_id, ProjectSnapshot.snapshot_date.desc())
        )
        rows = (await self.db.execute(stmt)).scalars().all()
        out: dict[UUID, int] = {}
        for snap in rows:  # newest first per project, keep the first one seen
            out.setdefault(snap.project_id, int(snap.progress_percentage or 0))
        return out

    async def pending_by_project(
        self, user_id: UUID, project_ids: list[UUID]
    ) -> dict[UUID, int]:
        """
        project_id -> number of SUBMITTED tasks where this user is an assigned reviewer.
        Same rule as TaskRepo.get_tasks_by_reviewer, but counted for all projects at once.
        """
        if not project_ids:
            return {}
        stmt = (
            select(Task.project_id, func.count(func.distinct(Task.id)))
            .join(AssignedReviewer, AssignedReviewer.task_id == Task.id)
            .join(ProjectMember, ProjectMember.id == AssignedReviewer.member_id)
            .where(
                ProjectMember.user_id == user_id,
                Task.status == Status.SUBMITTED,
                Task.project_id.in_(project_ids),
            )
            .group_by(Task.project_id)
        )
        rows = (await self.db.execute(stmt)).all()
        return {project_id: count for project_id, count in rows}

    async def open_tasks_due_by(
        self, project_ids: list[UUID], last_day: date, limit: int = 100
    ) -> list[Task]:
        """
        Open tasks (not started / in progress) with a deadline on or before last_day,
        soonest first. Overdue tasks are included. Assignees and their users are loaded
        in the same call.
        """
        if not project_ids:
            return []
        stmt = (
            select(Task)
            .where(
                Task.project_id.in_(project_ids),
                Task.status.in_([Status.NOT_STARTED, Status.IN_PROGRESS]),
                Task.deadline.is_not(None),
                Task.deadline <= last_day,
            )
            .order_by(Task.deadline.asc())
            .limit(limit)
            .options(
                selectinload(Task.assigned_members)
                .selectinload(AssignedMember.members)
                .selectinload(ProjectMember.user)
            )
        )
        return list((await self.db.execute(stmt)).scalars().all())

    async def overdue_count(self, project_ids: list[UUID], today: date) -> int:
        """Open tasks past their deadline, across all of the user's projects."""
        if not project_ids:
            return 0
        stmt = select(func.count(Task.id)).where(
            Task.project_id.in_(project_ids),
            Task.status.in_([Status.NOT_STARTED, Status.IN_PROGRESS]),
            Task.deadline.is_not(None),
            Task.deadline < today,
        )
        return int((await self.db.execute(stmt)).scalar_one())