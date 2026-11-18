from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.task_submissions.model import TaskSubmission
from app.modules.task_submissions.repo import TaskSubmissionRepo
from app.modules.task_submissions.schema import TaskSubmissionCreate, TaskSubmissionUpdate
from app.modules.member_activities.model import ActivityType
from app.modules.member_activities.services import MemberActivityService
from app.modules.notifications.services import NotificationService
from app.modules.project_members.model import ProjectRole
from app.modules.tasks.repo import TaskRepo
from uuid import UUID
from fastapi import HTTPException, status


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
    async def create_task_submission(
        db: AsyncSession,
        task_submission: TaskSubmissionCreate,
        actor_id: UUID,
        actor_name: str,
    ):
        repo = TaskSubmissionRepo(db)
        task = await TaskRepo(db).get_by_id(task_submission.task_id)
        if task is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found",
            )

        created_submission = await repo.create(task_submission)
        recorded = await MemberActivityService.log(
            db,
            project_id=task.project_id,
            user_id=actor_id,
            type=ActivityType.TASK_SUBMITTED,
            message=f'{actor_name} submitted work for "{task.name}".',
            task_id=task.id,
            commit=False,
        )
        if not recorded:
            await NotificationService.notify_project_roles(
                db,
                task.project_id,
                {ProjectRole.LEADER, ProjectRole.INSTRUCTOR},
                actor_id=actor_id,
                title=f"Task submitted: {task.name}",
                body=f'{actor_name} submitted work for "{task.name}".',
            )
        return created_submission

    @staticmethod
    async def update_task_submission(db: AsyncSession, db_item: TaskSubmissionUpdate, task_submission: TaskSubmissionUpdate):
        repo = TaskSubmissionRepo(db)
        return await repo.update(db_item, task_submission)

    @staticmethod
    async def delete_task_submission(db: AsyncSession, db_item: TaskSubmission):
        repo = TaskSubmissionRepo(db)
        return await repo.delete(db_item)
