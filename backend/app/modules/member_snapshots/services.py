from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from .model import MemberSnapshot
from .repo import MemberSnapshotRepo
from .schema import MemberSnapshotUpsert


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
    async def upsert_today_member_snapshot(
        db: AsyncSession, member_id: UUID, snapshot: MemberSnapshotUpsert
    ):
        repo = MemberSnapshotRepo(db)
        return await repo.upsert_today_member_snapshot(member_id, snapshot)

    @staticmethod
    async def get_latest_snapshot(db: AsyncSession, member_id: UUID):
        repo = MemberSnapshotRepo(db)
        return await repo.get_latest_member_snapshot(member_id)

    @staticmethod
    async def delete_member_snapshot(db: AsyncSession, db_item: MemberSnapshot):
        repo = MemberSnapshotRepo(db)
        return await repo.delete(db_item)

    @staticmethod
    async def calculate_member_workload(
        db: AsyncSession, member_id: UUID, *, commit: bool = True
    ):
        """
        Compatibility wrapper. Workload is always recalculated for the WHOLE project
        (median baseline means one member's change affects everyone's status), then
        this member's fresh snapshot is returned. Prefer calling
        ProjectSnapshotService.calculate_project_workload(db, project_id) directly.
        """
        # Lazy imports: project_snapshots.services imports this module at the top.
        from app.modules.project_members.services import ProjectMemberService
        from app.modules.project_snapshots.services import ProjectSnapshotService

        member = await ProjectMemberService.get_one_member(db, member_id)
        if member is None:
            return None

        await ProjectSnapshotService.calculate_project_workload(
            db, member.project_id, commit=commit
        )
        return await MemberSnapshotRepo(db).get_latest_member_snapshot(member_id)