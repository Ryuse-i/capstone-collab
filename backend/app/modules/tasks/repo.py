from sqlalchemy import select
from sqlalchemy.orm import selectinload
from uuid import UUID
from app.core.base_repo import BaseRepo
from app.modules.assigned_members.model import AssignedMember
from app.modules.tasks.model import Task
from typing import Sequence

from app.modules.tasks.schema import TaskResponse


class TaskRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, Task)

    async def get_assigned_member(self, task_id: UUID):
        stmt = (
            select(Task)
            .where(Task.id == task_id)
            .options(selectinload(Task.assigned_members))
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_assigned_members(self, project_id: UUID):
        stmt = (
            select(Task)
            .where(Task.project_id == project_id)
            .options(
                selectinload(Task.assigned_members).selectinload(AssignedMember.users)
            )
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_all_project_tasks(self, project_id):
        stmt = select(Task).where(Task.project_id == project_id)

        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def batch_get_task(self, ids: Sequence[UUID]) -> list[TaskResponse]:
        if not ids:
            return []

        stmt = select(Task).where(Task.id.in_(ids))
        results = await self.db.execute(stmt)
        return results.scalars().all()
