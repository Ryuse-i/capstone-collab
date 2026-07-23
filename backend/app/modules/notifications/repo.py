from sqlalchemy import select
from app.core.base_repo import BaseRepo
from .model import Notification
from uuid import UUID

class NotificationRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, Notification)

    async def get_user_notifications(self, user_id: UUID) -> list[Notification]:
        query = select(Notification).where(Notification.user_id == user_id)
        notification = await self.db.execute(query)

        return list(notification.scalars().all())
