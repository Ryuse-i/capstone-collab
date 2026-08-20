from app.core.base_repo import BaseRepo
from .model import AssignedMember
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from uuid import UUID



class AssignedMemberRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, AssignedMember)

    async def get_task_members(self, task_id: UUID):
        stmt = (
            select(AssignedMember)
            .where(AssignedMember.task_id == task_id)
            .options(selectinload(AssignedMember.users))
        )

        result = await self.db.execute(stmt)
        return result.scalars().all()

