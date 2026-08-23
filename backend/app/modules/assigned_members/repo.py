from app.core.base_repo import BaseRepo
from .model import AssignedMember
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from uuid import UUID


class AssignedMemberRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, AssignedMember)

    # get all members base on task id
    async def get_task_members(self, task_id: UUID):
        stmt = (
            select(AssignedMember)
            .where(AssignedMember.task_id == task_id)
            .options(selectinload(AssignedMember.users))
        )

        result = await self.db.execute(stmt)
        return result.scalars().all()

    # get all assigned rows base on member id
    async def get_members(self, member_id: UUID):
        stmt = select(AssignedMember).where(AssignedMember.user_id == member_id)

        result = await self.db.execute(stmt)
        return result.scalars().all()
