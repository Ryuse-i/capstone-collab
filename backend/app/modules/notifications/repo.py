from typing import Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .model import Notification, NotificationType  # was: type untyped


class NotificationRepo:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        user_id: UUID,
        type: NotificationType,  # was: untyped — matched service fix
        title: str,
        body: str,
        reference_id: UUID | None = None,
    ) -> Notification:
        notif = Notification(
            user_id=user_id,
            type=type,
            title=title,
            body=body,
            reference_id=reference_id,
        )
        self.db.add(notif)
        await self.db.commit()
        await self.db.refresh(notif)
        return notif

    async def get_for_user(self, user_id: UUID) -> Sequence[Notification]:
        result = await self.db.execute(
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
        )
        return result.scalars().all()

    async def get_by_id(self, notif_id: UUID) -> Notification | None:
        result = await self.db.execute(
            select(Notification).where(Notification.id == notif_id)
        )
        return result.scalar_one_or_none()

    async def mark_read(
        self,
        notif: Notification,
        is_read: bool = True,  # was: hardcoded True — now accepts value from service
    ) -> Notification:
        notif.is_read = is_read
        await self.db.commit()
        await self.db.refresh(notif)
        return notif
