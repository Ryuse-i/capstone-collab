from datetime import datetime
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_async_session
from app.modules.messages.schema import CreateMessage, MessageResponse
from app.modules.messages.services import MessageService
from app.modules.users.services import current_active_user
from app.modules.users.model import User

message_router = APIRouter()


@message_router.get("", response_model=List[MessageResponse])
async def get_messages(
    project_id: UUID,
    before: datetime | None = None,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    return await MessageService.get_project_messages(db, project_id, before)


@message_router.post("", response_model=MessageResponse)
async def create_message(
    message: CreateMessage,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    return await MessageService.send_message(db, current_user.id, message)
