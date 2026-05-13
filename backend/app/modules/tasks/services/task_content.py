from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from app.modules.tasks.models.task_content import TaskContent
from app.modules.tasks.repos.task_content import TaskContentRepo
from app.modules.tasks.schemas.task_content import TaskContentCreate, TaskContentUpdate


class TaskContentService:
    @staticmethod
    async def get_one_content(db: AsyncSession, content_id: UUID):
        repo = TaskContentRepo(db)
        return await repo.get_by_id(content_id)

    @staticmethod
    async def get_all_contents(db: AsyncSession):
        repo = TaskContentRepo(db)
        return await repo.get_all()

    @staticmethod
    async def create_content(db: AsyncSession, content: TaskContentCreate):
        repo = TaskContentRepo(db)
        return await repo.create(content)

    @staticmethod
    async def update_content(
        db: AsyncSession, db_item: TaskContent, content: TaskContentUpdate
    ):
        repo = TaskContentRepo(db)
        return await repo.update(db_item, content)

    @staticmethod
    async def delete_content(db: AsyncSession, db_item: TaskContent):
        repo = TaskContentRepo(db)
        return await repo.delete(db_item)
