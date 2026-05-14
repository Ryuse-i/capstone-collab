from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.tasks.model import Task
from app.modules.tasks.repo import TaskRepo
from app.modules.tasks.schema import TaskCreate, TaskUpdate


class TaskService:
    @staticmethod
    async def get_one_task(db: AsyncSession, task_id):
        repo = TaskRepo(db)
        return await repo.get_by_id(task_id)

    @staticmethod
    async def get_all_tasks(db: AsyncSession):
        repo = TaskRepo(db)
        return await repo.get_all()

    @staticmethod
    async def create_task(db: AsyncSession, task: TaskCreate):
        repo = TaskRepo(db)
        return await repo.create(task)

    @staticmethod
    async def update_task(db: AsyncSession, db_item: TaskUpdate, task: TaskUpdate):
        repo = TaskRepo(db)
        return await repo.update(db_item, task)

    @staticmethod
    async def delete_task(db: AsyncSession, db_item: Task):
        repo = TaskRepo(db)
        return await repo.delete(db_item)
