from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.task_tags.model import Tag, TaskTag
from app.modules.task_tags.repo import TagRepo, TaskTagRepo
from app.modules.task_tags.schema import TagCreate, TagUpdate, TaskTagCreate, TaskTagUpdate


class TagService:
    @staticmethod
    async def get_one_tag(db: AsyncSession, tag_id):
        repo = TagRepo(db)
        return await repo.get_by_id(tag_id)

    @staticmethod
    async def get_all_tags(db: AsyncSession):
        repo = TagRepo(db)
        return await repo.get_all()

    @staticmethod
    async def create_tag(db: AsyncSession, tag: TagCreate):
        repo = TagRepo(db)
        return await repo.create(tag)

    @staticmethod
    async def update_tag(db: AsyncSession, db_item: TagUpdate, tag: TagUpdate):
        repo = TagRepo(db)
        return await repo.update(db_item, tag)

    @staticmethod
    async def delete_tag(db: AsyncSession, db_item: Tag):
        repo = TagRepo(db)
        return await repo.delete(db_item)


class TaskTagService:
    @staticmethod
    async def get_one_task_tag(db: AsyncSession, task_tag_id):
        repo = TaskTagRepo(db)
        return await repo.get_by_id(task_tag_id)

    @staticmethod
    async def get_all_task_tags(db: AsyncSession):
        repo = TaskTagRepo(db)
        return await repo.get_all()

    @staticmethod
    async def create_task_tag(db: AsyncSession, task_tag: TaskTagCreate):
        repo = TaskTagRepo(db)
        return await repo.create(task_tag)

    @staticmethod
    async def update_task_tag(db: AsyncSession, db_item: TaskTagUpdate, task_tag: TaskTagUpdate):
        repo = TaskTagRepo(db)
        return await repo.update(db_item, task_tag)

    @staticmethod
    async def delete_task_tag(db: AsyncSession, db_item: TaskTag):
        repo = TaskTagRepo(db)
        return await repo.delete(db_item)
