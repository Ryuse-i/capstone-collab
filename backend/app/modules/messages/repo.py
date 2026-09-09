from datetime import datetime
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from app.core.base_repo import BaseRepo
from app.modules.messages.model import Message


class MessageRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, Message)

    async def get_with_sender(self, message_id: UUID) -> Message | None:
        query = (
            select(Message)
            .where(Message.id == message_id)
            .options(joinedload(Message.sender))
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    #get the list of messages for the project  
    async def list_for_project(
        self, project_id: UUID, limit: int = 50, before: datetime | None = None
    ) -> list[Message]:
        query = (
            select(Message)
            .where(Message.project_id == project_id)
            .options(joinedload(Message.sender))
            .order_by(Message.created_at.asc())
            .limit(limit)
        )
        if before:
            query = query.where(Message.created_at < before)
        result = await self.db.execute(query)
        return list(result.unique().scalars().all())
