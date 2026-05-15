from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.task_comments.model import TaskComment
from app.modules.task_comments.repo import TaskCommentRepo
from app.modules.task_comments.schema import TaskCommentCreate, TaskCommentUpdate


class TaskCommentService:
    @staticmethod
    async def get_one_task_comment(db: AsyncSession, task_comment_id):
        repo = TaskCommentRepo(db)
        return await repo.get_by_id(task_comment_id)

    @staticmethod
    async def get_all_task_comments(db: AsyncSession):
        repo = TaskCommentRepo(db)
        return await repo.get_all()

    @staticmethod
    async def create_task_comment(db: AsyncSession, task_comment: TaskCommentCreate):
        repo = TaskCommentRepo(db)
        return await repo.create(task_comment)

    @staticmethod
    async def update_task_comment(db: AsyncSession, db_item: TaskCommentUpdate, task_comment: TaskCommentUpdate):
        repo = TaskCommentRepo(db)
        return await repo.update(db_item, task_comment)

    @staticmethod
    async def delete_task_comment(db: AsyncSession, db_item: TaskComment):
        repo = TaskCommentRepo(db)
        return await repo.delete(db_item)
