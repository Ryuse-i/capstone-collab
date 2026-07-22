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
    async def create_notification(db: AsyncSession, notification: CreateNotification):
        repo = NotificationRepo(db)
        notification = await repo.create(notification)
        await db.commit()
        return notification

    @staticmethod
    async def update_notification(
        db: AsyncSession, db_item: UpdateNotification, notification: UpdateNotification
    ):
        repo = NotificationRepo(db)
        notification = await repo.update(db_item, notification)
        await db.commit()
        return notification


    @staticmethod
    async def delete_notification(db: AsyncSession, db_item: NotificationResponse):
        repo = NotificationRepo(db)
        await repo.delete(db_item)
        await db.commit()
        return None
