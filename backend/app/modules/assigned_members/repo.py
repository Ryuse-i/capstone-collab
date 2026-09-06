from app.core.base_repo import BaseRepo
from .model import AssignedMember
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from uuid import UUID
from typing import Sequence
from app.modules.project_members.model import ProjectMember


class AssignedMemberRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, AssignedMember)

    # get all members base on task id
    async def get_task_members(self, task_id: UUID):
        # get task members then get user information in the project member relationship
        stmt = (
            select(AssignedMember)
            .where(AssignedMember.task_id == task_id)
            .options(
                selectinload(AssignedMember.members).selectinload(ProjectMember.user)
            )
        )

        result = await self.db.execute(stmt)
        return result.scalars().all()

    # get all assigned rows base on member id
    async def get_members(self, member_id: UUID):
        stmt = select(AssignedMember).where(AssignedMember.member_id == member_id)

        result = await self.db.execute(stmt)
        return result.scalars().all()

    # returns all assigned members with task
    async def get_members_with_task(self, member_ids: Sequence[UUID]):
        if not id:
            return []

        stmt = (
            select(AssignedMember)
            .where(AssignedMember.member_id.in_(member_ids))
            .options(selectinload(AssignedMember.task))
        )

        results = await self.db.execute(stmt)
        return results.scalars().all()
