from uuid import UUID
from typing import List

from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_async_session
from app.modules.users.services import current_active_user
from app.modules.users.model import User
from .exceptions import NotificationNotFound
from .services import NotificationService
from .schema import NotificationMarkRead, NotificationResponse

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
    service = NotificationService(db)
    return await service.get_user_notifications(user.id)


@notification_router.patch(
    "/{notif_id}/read",
    response_model=NotificationResponse,
    status_code=status.HTTP_200_OK,
    responses={
        # was: missing — 404 path was invisible to OpenAPI clients
        status.HTTP_404_NOT_FOUND: {"description": "Notification not found"},
    },
)
async def mark_notification_read(
    notif_id: UUID,
    # was: no body at all — NotificationMarkRead was dead code; now wired in
    payload: NotificationMarkRead = Body(default_factory=NotificationMarkRead),
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    service = NotificationService(db)
    try:
        return await service.mark_notification_as_read(
            notif_id=notif_id,
            user=user,
            is_read=payload.is_read,
        )
    except NotificationNotFound:
        # was: HTTPException raised inside the service — now caught here where it belongs
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )
