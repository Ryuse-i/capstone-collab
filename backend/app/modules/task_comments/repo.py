from app.core.base_repo import BaseRepo
from app.modules.task_comments.model import TaskComment
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession


class TaskCommentRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, TaskComment)

    async def get_by_task_id(self, task_id):
        query = (
            select(self.model)
            .where(self.model.task_id == task_id)
            .options(selectinload(self.model.author))
        )
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_by_id(self, item_id):
        query = (
            select(self.model)
            .where(self.model.id == item_id)
            .options(selectinload(self.model.author))
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_all(self):
        query = select(self.model).options(selectinload(self.model.author))
        result = await self.db.execute(query)
        return result.scalars().all()
