from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.supertasks.model import Supertask
from app.modules.supertasks.repo import SupertaskRepo
from app.modules.supertasks.schema import SupertaskCreate, SupertaskUpdate


class SupertaskService:
    @staticmethod
    async def get_one_task(db: AsyncSession, task_id):
        repo = SupertaskRepo(db)
        return await repo.get_by_id(task_id)

    @staticmethod
    async def get_all_tasks(db: AsyncSession):
        repo = SupertaskRepo(db)
        return await repo.get_all()

    @staticmethod
    async def create_task(db: AsyncSession, task: SupertaskCreate):
        repo = SupertaskRepo(db)
        return await repo.create(task)

    @staticmethod
    async def update_task(db: AsyncSession, db_item: Supertask, task: SupertaskUpdate):
        repo = SupertaskRepo(db)
        return await repo.update(db_item, task)

    @staticmethod
    async def delete_task(db: AsyncSession, db_item: Supertask):
        repo = SupertaskRepo(db)
        return await repo.delete(db_item)
