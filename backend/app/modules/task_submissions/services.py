from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.task_submissions.model import TaskSubmission
from app.modules.task_submissions.repo import TaskSubmissionRepo
from app.modules.task_submissions.schema import TaskSubmissionCreate, TaskSubmissionUpdate


class TaskSubmissionService:
    @staticmethod
    async def get_one_task_submission(db: AsyncSession, task_submission_id):
        repo = TaskSubmissionRepo(db)
        return await repo.get_by_id(task_submission_id)

    @staticmethod
    async def get_all_task_submissions(db: AsyncSession):
        repo = TaskSubmissionRepo(db)
        return await repo.get_all()

    @staticmethod
    async def create_task_submission(db: AsyncSession, task_submission: TaskSubmissionCreate):
        repo = TaskSubmissionRepo(db)
        return await repo.create(task_submission)

    @staticmethod
    async def update_task_submission(db: AsyncSession, db_item: TaskSubmissionUpdate, task_submission: TaskSubmissionUpdate):
        repo = TaskSubmissionRepo(db)
        return await repo.update(db_item, task_submission)

    @staticmethod
    async def delete_task_submission(db: AsyncSession, db_item: TaskSubmission):
        repo = TaskSubmissionRepo(db)
        return await repo.delete(db_item)
