from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.notifications.schema import (
    CreateNotification,
    NotificationResponse,
    UpdateNotification,
)
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
    async def create_notification(db: AsyncSession, notification: CreateNotification):
        repo = NotificationRepo(db)
        return await repo.create(notification)

    @staticmethod
    async def update_notification(
        db: AsyncSession, db_item: UpdateNotification, notification: UpdateNotification
    ):
        repo = NotificationRepo(db)
        return await repo.update(db_item, notification)

    @staticmethod
    async def delete_notification(db: AsyncSession, db_item: NotificationResponse):
        repo = NotificationRepo(db)
        await repo.delete(db_item)
        return None
