from uuid import UUID
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.base_repo import BaseRepo
from app.modules.task_links.model import TaskLink


class TaskLinkRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, TaskLink)

    async def get_with_creator(self, link_id: UUID):
        stmt = (
            select(TaskLink)
            .where(TaskLink.id == link_id)
            .options(selectinload(TaskLink.creator))
            .execution_options(populate_existing=True)
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def get_by_task(self, task_id: UUID):
        stmt = (
            select(TaskLink)
            .where(TaskLink.task_id == task_id)
            .options(selectinload(TaskLink.creator))
            .order_by(TaskLink.created_at.desc())
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()