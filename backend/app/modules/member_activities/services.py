from datetime import datetime
from typing import Sequence
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from .model import ActivityType
from .repo import MemberActivityRepo
from .schema import RecentActivityItem, MemberActivityResponse


class MemberActivityService:
    @staticmethod
    async def log(
        db: AsyncSession,
        *,
        project_id: UUID,
        user_id: UUID,
        type: ActivityType,
        message: str,
        task_id: UUID | None = None,
        commit: bool = True,
    ) -> None:
        """Append an activity row for the user's membership in the project.
        Skips silently if the user isn't a member (e.g. an admin)."""
        repo = MemberActivityRepo(db)
        member_id = await repo.get_member_id(user_id, project_id)
        if member_id is None:
            return
        await repo.add(member_id, message, type.value, task_id)
        if commit:
            await db.commit()

    @staticmethod
    async def is_project_member(
        db: AsyncSession, user_id: UUID, project_id: UUID
    ) -> bool:
        repo = MemberActivityRepo(db)
        return await repo.get_member_id(user_id, project_id) is not None

    @staticmethod
    async def get_project_activity(
        db: AsyncSession, project_id: UUID, limit: int, before: datetime | None
    ) -> list[MemberActivityResponse]:
        repo = MemberActivityRepo(db)
        rows = await repo.get_by_project(project_id, limit, before)
        out = []
        for a, first, last, task_name in rows:
            name = " ".join(p for p in (first, last) if p) or None
            item = MemberActivityResponse.model_validate(a)
            item.actor_name = name
            item.task_name = task_name
            out.append(item)
        return out

    @staticmethod
    async def get_recent_for_dashboard(
        db: AsyncSession, project_ids: Sequence[UUID], limit: int = 10
    ) -> list[RecentActivityItem]:
        repo = MemberActivityRepo(db)
        rows = await repo.get_recent_for_projects(project_ids, limit)
        return [
            RecentActivityItem(
                id=str(a.id),
                project_id=str(pid),
                project_name=name,
                message=a.detail,
                timestamp=a.created_at,
                type=a.type,
                actor_name=" ".join(p for p in (first, last) if p) or None,
            )
            for a, pid, name, first, last in rows
        ]