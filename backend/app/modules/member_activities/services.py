from sqlalchemy.ext.asyncio import AsyncSession
from .model import MemberActivity
from .repo import MemberActivityRepo
from .schema import MemberActivityCreate, MemberActivityUpdate


class MemberActivityService:
    @staticmethod
    async def get_one_member_activity(db: AsyncSession, member_activity_id):
        repo = MemberActivityRepo(db)
        return await repo.get_by_id(member_activity_id)

    @staticmethod
    async def get_all_member_activities(db: AsyncSession):
        repo = MemberActivityRepo(db)
        return await repo.get_all()

    @staticmethod
    async def create_member_activity(
        db: AsyncSession, member_activity: MemberActivityCreate
    ):
        repo = MemberActivityRepo(db)
        return await repo.create(member_activity)

    @staticmethod
    async def update_member_activity(
        db: AsyncSession,
        db_item: MemberActivityUpdate,
        member_activity: MemberActivityUpdate,
    ):
        repo = MemberActivityRepo(db)
        return await repo.update(db_item, member_activity)

    @staticmethod
    async def delete_member_activity(db: AsyncSession, db_item: MemberActivity):
        repo = MemberActivityRepo(db)
        return await repo.delete(db_item)
