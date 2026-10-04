from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_async_session
from app.modules.files.schema import FileUrlResponse
from app.modules.files.services import FileService
from app.modules.users.model import User
from app.modules.users.services import current_active_user

files_router = APIRouter()


@files_router.get("/{file_id}/url", response_model=FileUrlResponse)
async def get_file_url(
    file_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    return FileUrlResponse(url=await FileService.get_url(db, file_id))