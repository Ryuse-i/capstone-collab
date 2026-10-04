from uuid import UUID
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.base_repo import BaseRepo
from app.modules.task_attachments.model import TaskAttachment


class TaskAttachmentRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, TaskAttachment)

    async def get_with_file(self, attachment_id: UUID):
        stmt = (
            select(TaskAttachment)
            .where(TaskAttachment.id == attachment_id)
            .options(selectinload(TaskAttachment.file))
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def get_by_task(self, task_id: UUID):
        stmt = (
            select(TaskAttachment)
            .where(TaskAttachment.task_id == task_id)
            .options(selectinload(TaskAttachment.file))
            .order_by(TaskAttachment.created_at.desc())
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()