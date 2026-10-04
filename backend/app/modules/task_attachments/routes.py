from uuid import UUID
from fastapi import APIRouter, Depends, File, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_async_session
from app.modules.files.schema import FileUrlResponse
from app.modules.task_attachments.schema import TaskAttachmentResponse
from app.modules.task_attachments.services import TaskAttachmentService
from app.modules.users.model import User
from app.modules.users.services import current_active_user

task_attachment_router = APIRouter()


@task_attachment_router.post(
    "/tasks/{task_id}",
    response_model=TaskAttachmentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_attachment(
    task_id: UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    return await TaskAttachmentService.add(db, task_id, file, current_user.id)


@task_attachment_router.get(
    "/tasks/{task_id}", response_model=list[TaskAttachmentResponse]
)
async def list_attachments(
    task_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    return await TaskAttachmentService.get_by_task(db, task_id)


@task_attachment_router.get("/{attachment_id}/url", response_model=FileUrlResponse)
async def get_attachment_url(
    attachment_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    return FileUrlResponse(
        url=await TaskAttachmentService.get_url(db, attachment_id)
    )


@task_attachment_router.delete("/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_attachment(
    attachment_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    await TaskAttachmentService.delete(db, attachment_id)
    return None