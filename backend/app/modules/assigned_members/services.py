from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.assigned_members.model import AssignedMember
from app.modules.assigned_members.repo import AssignedMemberRepo
from app.modules.assigned_members.schema import AssignedMemberCreate, AssignedMemberUpdate


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
    async def create_assigned_member(db: AsyncSession, assigned_member: AssignedMemberCreate):
        repo = AssignedMemberRepo(db)
        return await repo.create(assigned_member)

    @staticmethod
    async def update_assigned_member(db: AsyncSession, db_item: AssignedMemberUpdate, assigned_member: AssignedMemberUpdate):
        repo = AssignedMemberRepo(db)
        return await repo.update(db_item, assigned_member)

    @staticmethod
    async def delete_assigned_member(db: AsyncSession, db_item: AssignedMember):
        repo = AssignedMemberRepo(db)
        return await repo.delete(db_item)
