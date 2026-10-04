from uuid import UUID
from fastapi import HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.files.services import FileService
from app.modules.task_attachments.repo import TaskAttachmentRepo
from app.modules.task_attachments.schema import TaskAttachmentCreate
from app.modules.tasks.services import TaskService


class TaskAttachmentService:
    @staticmethod
    async def add(db: AsyncSession, task_id: UUID, file: UploadFile, user_id: UUID):
        task = await TaskService.get_one_task(db, task_id)
        if not task:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Task not found")

        stored = await FileService.upload(
            db, file, purpose="task_attachment", uploaded_by=user_id
        )

        repo = TaskAttachmentRepo(db)
        try:
            created = await repo.create(
                TaskAttachmentCreate(task_id=task_id, file_id=stored.id)
            )
        except Exception:
            await FileService.delete(db, stored.id)  # roll back the upload
            raise
        return await repo.get_with_file(created.id)

    @staticmethod
    async def get_by_task(db: AsyncSession, task_id: UUID):
        repo = TaskAttachmentRepo(db)
        return await repo.get_by_task(task_id)

    @staticmethod
    async def get_url(db: AsyncSession, attachment_id: UUID) -> str:
        repo = TaskAttachmentRepo(db)
        attachment = await repo.get_with_file(attachment_id)
        if not attachment:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Attachment not found")
        return await FileService.get_url(db, attachment.file_id)

    @staticmethod
    async def delete(db: AsyncSession, attachment_id: UUID):
        repo = TaskAttachmentRepo(db)
        attachment = await repo.get_with_file(attachment_id)
        if not attachment:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Attachment not found")
        # Deleting the file row cascades to the attachment row too
        await FileService.delete(db, attachment.file_id)