from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.project_members.model import ProjectMember, ProjectRole
from app.modules.projects.model import Project
from app.modules.notifications.model import Notification
from app.modules.notifications.schema import CreateNotification, UpdateNotification
from app.modules.users.model import User, UserRole
from .repo import NotificationRepo
from uuid import UUID


class NotificationService:
    @staticmethod
    async def get_one_notification(db: AsyncSession, id: UUID):
        repo = NotificationRepo(db)
        return await repo.get_by_id(id)

    @staticmethod
    async def get_all_notifications(db: AsyncSession, user_id: UUID):
        repo = NotificationRepo(db)
        return await repo.get_user_notifications(user_id)

    @staticmethod
    async def get_user_notification(
        db: AsyncSession, notification_id: UUID, user_id: UUID
    ):
        notification = await NotificationService.get_one_notification(
            db, notification_id
        )
        if notification is None or notification.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found",
            )
        return notification

    @staticmethod
    async def create_notification(db: AsyncSession, notification: CreateNotification):
        repo = NotificationRepo(db)
        return await repo.create(notification)

    @staticmethod
    async def create_notifications_for_users(
        db: AsyncSession,
        user_ids: set[UUID],
        *,
        actor_id: UUID | None,
        title: str,
        body: str,
    ) -> None:
        for user_id in user_ids:
            if user_id == actor_id:
                continue
            await NotificationService.create_notification(
                db,
                CreateNotification(user_id=user_id, title=title, body=body),
            )

    @staticmethod
    async def notify_project_roles(
        db: AsyncSession,
        project_id: UUID,
        roles: set[ProjectRole],
        *,
        actor_id: UUID | None,
        title: str,
        body: str,
    ) -> None:
        result = await db.execute(select(Project).where(Project.id == project_id))
        project = result.scalar_one_or_none()
        if project is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found for notification",
            )

        member_result = await db.execute(
            select(ProjectMember.user_id, ProjectMember.project_role).where(
                ProjectMember.project_id == project_id
            )
        )
        recipients: set[UUID] = set()
        for user_id, project_role in member_result.all():
            if user_id is not None and project_role in roles:
                recipients.add(user_id)

        if ProjectRole.LEADER in roles and project.created_by is not None:
            recipients.add(project.created_by)
        if ProjectRole.ADVISOR in roles and project.advisor is not None:
            recipients.add(project.advisor)
        if ProjectRole.INSTRUCTOR in roles and project.instructor is not None:
            recipients.add(project.instructor)

        await NotificationService.create_notifications_for_users(
            db, recipients, actor_id=actor_id, title=title, body=body
        )

    @staticmethod
    async def notify_task_assignees(
        db: AsyncSession,
        member_user_ids: set[UUID],
        *,
        actor_id: UUID | None,
        title: str,
        body: str,
    ) -> None:
        await NotificationService.create_notifications_for_users(
            db, member_user_ids, actor_id=actor_id, title=title, body=body
        )

    @staticmethod
    async def notify_admins(
        db: AsyncSession,
        *,
        actor_id: UUID | None,
        title: str,
        body: str,
    ) -> None:
        result = await db.execute(
            select(User.id).where(
                User.role == UserRole.ADMIN,
                User.is_active.is_(True),
                User.deleted_at.is_(None),
            )
        )
        admin_ids = set(result.scalars().all())
        await NotificationService.create_notifications_for_users(
            db, admin_ids, actor_id=actor_id, title=title, body=body
        )

    @staticmethod
    async def update_notification(
        db: AsyncSession, db_item: Notification, notification: UpdateNotification
    ):
        repo = NotificationRepo(db)
        return await repo.update(db_item, notification)

    @staticmethod
    async def delete_read_notification(
        db: AsyncSession, db_item: Notification
    ) -> None:
        if not db_item.is_read:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Unread notifications cannot be cleared",
            )
        repo = NotificationRepo(db)
        await repo.delete(db_item)
        return None
