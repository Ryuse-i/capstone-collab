from sqlalchemy import select
from sqlalchemy.orm import selectinload
from uuid import UUID
from app.core.base_repo import BaseRepo
from app.modules.tasks.model import Task


class TaskRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, Task)

    async def get_assigned_members(self, task_id: UUID):
        stmt = (
            select(Task)
            .where(Task.id == task_id)
            .options(selectinload(Task.assigned_members))
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_all_project_tasks(self, project_id):
        stmt = select(Task).where(Task.project_id == project_id)

        result = await self.db.execute(stmt)
        return result.scalars().all()
