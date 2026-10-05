from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_async_session
from app.modules.files.schema import FileUrlResponse
from app.modules.files.services import FileService
from app.modules.users.model import User, UserRole
from app.modules.users.services import current_active_user

files_router = APIRouter()


@files_router.get("/{file_id}/url", response_model=FileUrlResponse)
async def get_file_url(
    file_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    record = await FileService.get_one(db, file_id)
    if record is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "File not found")
    if current_user.role != UserRole.ADMIN and record.uploaded_by != current_user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not allowed")
    return FileUrlResponse(url=await FileService.get_url(db, file_id))