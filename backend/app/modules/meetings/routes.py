from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_async_session
from app.modules.users.model import User
from app.modules.users.services import current_active_user

from .schema import CreateMeetingRequest, MeetingResponse
from .services import MeetingService

meeting_router = APIRouter()


@meeting_router.post(
    "",
    response_model=MeetingResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_meeting(
    request: CreateMeetingRequest,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    return await MeetingService.create_meeting(db, current_user, request)


@meeting_router.get(
    "/project/{project_id}",
    response_model=list[MeetingResponse],
)
async def get_project_meetings(
    project_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    return await MeetingService.get_project_meetings(db, current_user, project_id)


@meeting_router.get(
    "/{meeting_id}",
    response_model=MeetingResponse,
)
async def get_meeting(
    meeting_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    return await MeetingService.get_meeting(db, current_user, meeting_id)


@meeting_router.delete(
    "/{meeting_id}",
    response_model=MeetingResponse,
)
async def cancel_meeting(
    meeting_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    return await MeetingService.cancel_meeting(db, current_user, meeting_id)
