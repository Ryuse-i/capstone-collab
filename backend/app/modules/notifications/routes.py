from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_async_session
from app.modules.notifications.services import NotificationService
from app.modules.users.services import current_active_user
from app.modules.users.model import User
from uuid import UUID

from .schema import NotificationResponse, UpdateNotification

# was: APIRouter() with no prefix — prefix now lives here, not scattered across include_router calls
notification_router = APIRouter()


@notification_router.get(
    "/",
    response_model=List[NotificationResponse],
    status_code=status.HTTP_200_OK,
)
async def get_my_notifications(
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    return await NotificationService.get_all_notifications(db, user.id)


@notification_router.patch(
    "/mark_as_read/${id}",
    response_model=NotificationResponse,
    status_code=status.HTTP_200_OK,
)
async def mark_as_read(db: AsyncSession, id: UUID):
    db_item = await NotificationService.get_one_notification(db, id)
    notification = UpdateNotification(is_read=True)
    return await NotificationService.update_notification(db, db_item, notification)
