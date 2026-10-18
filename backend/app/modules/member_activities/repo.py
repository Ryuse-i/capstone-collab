from datetime import datetime
from typing import Sequence
from uuid import UUID

from sqlalchemy import select

from app.core.base_repo import BaseRepo
from app.modules.project_members.model import ProjectMember
from app.modules.projects.model import Project
from app.modules.users.model import User
from app.modules.tasks.model import Task
from .model import MemberActivity


class MemberActivityRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, MemberActivity)

    async def get_member_id(self, user_id: UUID, project_id: UUID) -> UUID | None:
        stmt = select(ProjectMember.id).where(
            ProjectMember.user_id == user_id,
            ProjectMember.project_id == project_id,
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def add(
        self, member_id: UUID, detail: str, type: str, task_id: UUID | None
    ) -> MemberActivity:
        activity = MemberActivity(
            member_id=member_id, detail=detail, type=type, task_id=task_id
        )
        self.db.add(activity)
        await self.db.flush()
        return activity

    async def get_by_project(
        self, project_id: UUID, limit: int, before: datetime | None
    ) -> list[tuple[MemberActivity, str | None, str | None, str | None]]:
        stmt = (
            select(MemberActivity, User.first_name, User.last_name, Task.name)
            .join(ProjectMember, ProjectMember.id == MemberActivity.member_id)
            .outerjoin(User, User.id == ProjectMember.user_id)
            .outerjoin(Task, Task.id == MemberActivity.task_id)
            .where(ProjectMember.project_id == project_id)
        )
        if before is not None:
            stmt = stmt.where(MemberActivity.created_at < before)
        stmt = stmt.order_by(MemberActivity.created_at.desc()).limit(limit)
        result = await self.db.execute(stmt)
        return [(r[0], r[1], r[2], r[3]) for r in result.all()]

    async def get_recent_for_projects(
        self, project_ids: Sequence[UUID], limit: int
    ) -> list[tuple[MemberActivity, UUID, str, str | None, str | None]]:
        if not project_ids:
            return []
        stmt = (
            select(
                MemberActivity,
                Project.id,
                Project.name,
                User.first_name,
                User.last_name,
            )
            .join(ProjectMember, ProjectMember.id == MemberActivity.member_id)
            .join(Project, Project.id == ProjectMember.project_id)
            .outerjoin(User, User.id == ProjectMember.user_id)
            .where(Project.id.in_(project_ids))
            .order_by(MemberActivity.created_at.desc())
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return [tuple(row) for row in result.all()]