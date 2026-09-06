from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.assigned_members.model import AssignedMember
from app.modules.assigned_members.repo import AssignedMemberRepo
from .schema import AssignedMemberCreate, AssignedMemberResponse, AssignedMemberUpdate
from uuid import UUID
from typing import Sequence


class AssignedMemberService:
    @staticmethod
    async def get_one_assigned_member(db: AsyncSession, assigned_member_id):
        repo = AssignedMemberRepo(db)
        return await repo.get_by_id(assigned_member_id)

    @staticmethod
    async def get_all_assigned_members(db: AsyncSession):
        repo = AssignedMemberRepo(db)
        return await repo.get_all()

    @staticmethod
    async def create_assigned_member(
        db: AsyncSession, assigned_member: AssignedMemberCreate
    ):
        repo = AssignedMemberRepo(db)

        # get task
        member = await repo.create(assigned_member)
        # calculate the member workload
        from app.modules.member_snapshots.services import MemberSnapshotService

        await MemberSnapshotService.calculate_member_workload(db, member.member_id)

        return member

    @staticmethod
    async def update_assigned_member(
        db: AsyncSession,
        db_item: AssignedMemberUpdate,
        assigned_member: AssignedMemberUpdate,
    ):
        repo = AssignedMemberRepo(db)
        return await repo.update(db_item, assigned_member)

    @staticmethod
    async def delete_assigned_member(db: AsyncSession, db_item: AssignedMember):
        repo = AssignedMemberRepo(db)
        return await repo.delete(db_item)

    @staticmethod
    async def get_task_members(db, task_id: UUID):
        repo = AssignedMemberRepo(db)

        results = await repo.get_task_members(task_id)

        users = [result.members.user for result in results]
        return users

    @staticmethod
    async def batch_create_members(
        db: AsyncSession, members: list[AssignedMemberCreate]
    ):
        repo = AssignedMemberRepo(db)

        for member in members:
            response = await repo.create(member)

            result = []
            result.append(response.users)
            return result

    @staticmethod
    async def get_members(
        db: AsyncSession, member_id: UUID
    ) -> list[AssignedMemberResponse]:
        repo = AssignedMemberRepo(db)
        return await repo.get_members(member_id)

    @staticmethod
    async def get_members_with_task(db: AsyncSession, member_ids: Sequence[UUID]):
        repo = AssignedMemberRepo(db)

        return await repo.get_members_with_task(member_ids)
