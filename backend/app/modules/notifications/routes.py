from uuid import UUID
from typing import List

from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_async_session
from app.modules.users.services import current_active_user
from app.modules.users.model import User
from .services import NotificationService
from .schema import NotificationResponse

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
