from sqlalchemy.ext.asyncio import AsyncSession
from .model import MemberSnapshot
from .repo import MemberSnapshotRepo
from .schema import MemberSnapshotCreate, MemberSnapshotUpdate


class MemberSnapshotService:
    @staticmethod
    async def get_one_member_snapshot(db: AsyncSession, member_snapshot_id):
        repo = MemberSnapshotRepo(db)
        return await repo.get_by_id(member_snapshot_id)

    @staticmethod
    async def get_all_member_snapshots(db: AsyncSession):
        repo = MemberSnapshotRepo(db)
        return await repo.get_all()

    @staticmethod
    async def create_member_snapshot(db: AsyncSession, member_snapshot: MemberSnapshotCreate):
        repo = MemberSnapshotRepo(db)
        return await repo.create(member_snapshot)

    @staticmethod
    async def update_member_snapshot(db: AsyncSession, db_item: MemberSnapshotUpdate, member_snapshot: MemberSnapshotUpdate):
        repo = MemberSnapshotRepo(db)
        return await repo.update(db_item, member_snapshot)

    @staticmethod
    async def delete_member_snapshot(db: AsyncSession, db_item: MemberSnapshot):
        repo = MemberSnapshotRepo(db)
        return await repo.delete(db_item)
