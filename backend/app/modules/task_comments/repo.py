from app.core.base_repo import BaseRepo
from app.modules.task_comments.model import TaskComment
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


class TaskCommentRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, TaskComment)

    async def get_by_task_id(self, task_id):
        query = select(self.model).where(self.model.task_id == task_id)
        result = await self.db.execute(query)
        return result.scalars().all()
