from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.task_relations.model import TaskRelation
from app.modules.task_relations.repo import TaskRelationRepo
from app.modules.task_relations.schema import TaskRelationCreate, TaskRelationUpdate


class TaskRelationService:
    @staticmethod
    async def get_one_task_relation(db: AsyncSession, task_relation_id):
        repo = TaskRelationRepo(db)
        return await repo.get_by_id(task_relation_id)

    @staticmethod
    async def get_all_task_relations(db: AsyncSession):
        repo = TaskRelationRepo(db)
        return await repo.get_all()

    @staticmethod
    async def create_task_relation(db: AsyncSession, task_relation: TaskRelationCreate):
        repo = TaskRelationRepo(db)
        return await repo.create(task_relation)

    @staticmethod
    async def update_task_relation(db: AsyncSession, db_item: TaskRelationUpdate, task_relation: TaskRelationUpdate):
        repo = TaskRelationRepo(db)
        return await repo.update(db_item, task_relation)

    @staticmethod
    async def delete_task_relation(db: AsyncSession, db_item: TaskRelation):
        repo = TaskRelationRepo(db)
        return await repo.delete(db_item)
