from typing import Sequence
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.users.model import User
from .model import Notification, NotificationType
from .repo import NotificationRepo
from .exceptions import NotificationNotFound  # new: domain exception (see exceptions.py)


class NotificationService:
    def __init__(self, db: AsyncSession):
        self.repo = NotificationRepo(db)

    async def create_notification(
        self,
        user_id: UUID,
        notification_type: NotificationType,  # was: str — caused DB-layer type error
        title: str,
        body: str,
        reference_id: UUID | None = None,
    ) -> Notification:
        return await self.repo.create(
            user_id=user_id,
            type=notification_type,
            title=title,
            body=body,
            reference_id=reference_id,
        )

    async def get_user_notifications(self, user_id: UUID) -> Sequence[Notification]:
        return await self.repo.get_for_user(user_id)

    async def mark_notification_as_read(
        self,
        notif_id: UUID,
        user: User,
        is_read: bool = True,  # new: accepts the value from NotificationMarkRead payload
    ) -> Notification:
        notif = await self.repo.get_by_id(notif_id)

        # was: raised HTTPException here — services should be framework-agnostic.
        # The router catches NotificationNotFound and converts it to a 404.
        if not notif or notif.user_id != user.id:
            raise NotificationNotFound(notif_id)

        return await self.repo.mark_read(notif, is_read=is_read)
