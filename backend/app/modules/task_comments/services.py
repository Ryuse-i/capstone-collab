from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.task_comments.model import TaskComment
from app.modules.task_comments.repo import TaskCommentRepo
from app.modules.task_comments.schema import TaskCommentCreate, TaskCommentUpdate
from app.modules.tasks.repo import TaskRepo
from app.modules.assigned_members.model import AssignedMember
from app.modules.project_members.model import ProjectMember, ProjectRole
from app.modules.projects.model import Project
from app.modules.notifications.services import NotificationService
from app.modules.member_activities.model import ActivityType
from app.modules.member_activities.services import MemberActivityService
from sqlalchemy import select
from typing import List


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
    async def get_task_comments_by_task_id(db: AsyncSession, task_id):
        repo = TaskCommentRepo(db)
        return await repo.get_by_task_id(task_id)

    @staticmethod
    async def create_task_comment(db: AsyncSession, task_comment: TaskCommentCreate):
        repo = TaskCommentRepo(db)
        created_comment = await repo.create(task_comment)
        task = await TaskRepo(db).get_by_id(task_comment.task_id)
        if task is not None:
            await MemberActivityService.log(
                db,
                project_id=task.project_id,
                user_id=task_comment.author_id,
                type=ActivityType.COMMENT_ADDED,
                message=f'Commented on task "{task.name}".',
                task_id=task.id,
                commit=False,
            )
            assigned_users_result = await db.execute(
                select(ProjectMember.user_id)
                .join(AssignedMember, AssignedMember.member_id == ProjectMember.id)
                .where(
                    AssignedMember.task_id == task.id,
                    ProjectMember.user_id.is_not(None),
                )
            )
            assigned_user_ids = {
                user_id for (user_id,) in assigned_users_result.all()
            }
            leader_users_result = await db.execute(
                select(ProjectMember.user_id).where(
                    ProjectMember.project_id == task.project_id,
                    ProjectMember.project_role == ProjectRole.LEADER,
                    ProjectMember.user_id.is_not(None),
                )
            )
            project_result = await db.execute(
                select(Project.created_by, Project.instructor).where(
                    Project.id == task.project_id
                )
            )
            project_creator_id, instructor_id = project_result.one()
            assigned_user_ids.difference_update(
                user_id for (user_id,) in leader_users_result.all()
            )
            if project_creator_id is not None:
                assigned_user_ids.discard(project_creator_id)
            if instructor_id is not None:
                assigned_user_ids.discard(instructor_id)
            await NotificationService.notify_task_assignees(
                db,
                assigned_user_ids,
                actor_id=task_comment.author_id,
                title=f"New comment: {task.name}",
                body=f'A new comment was added to "{task.name}".',
            )
        return created_comment

    @staticmethod
    async def update_task_comment(db: AsyncSession, db_item: TaskComment, task_comment: TaskCommentUpdate):
        repo = TaskCommentRepo(db)
        return await repo.update(db_item, task_comment)

    @staticmethod
    async def delete_task_comment(db: AsyncSession, db_item: TaskComment):
        repo = TaskCommentRepo(db)
        return await repo.delete(db_item)
