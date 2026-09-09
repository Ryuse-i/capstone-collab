from datetime import datetime
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.messages.repo import MessageRepo
from app.modules.messages.schema import CreateMessage, CreateMessageInternal


class MessageService:
    @staticmethod
    async def send_message(db: AsyncSession, sender_id: UUID, message: CreateMessage):
        repo = MessageRepo(db)
        try:
            payload = CreateMessageInternal(
                project_id=message.project_id,
                sender_id=sender_id,
                content=message.content,
            )
            result = await repo.create(payload)
            return await repo.get_with_sender(result.id)
        except Exception:
            await db.rollback()
            raise

    @staticmethod
    async def get_project_messages(
        db: AsyncSession, project_id: UUID, before: datetime | None = None
    ):
        repo = MessageRepo(db)
        return await repo.list_for_project(project_id, before=before)
