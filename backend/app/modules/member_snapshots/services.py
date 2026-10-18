from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from .model import MemberSnapshot
from .repo import MemberSnapshotRepo
from .schema import MemberSnapshotUpsert, MemberSnapshotResponse

COMPLEXITY_POINTS: dict[str, int] = {"low": 1, "medium": 2, "high": 3}

class MemberSnapshotService:
    @staticmethod
    async def get_one_member_snapshot(db: AsyncSession, member_snapshot_id) -> MemberSnapshotResponse:
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
            db, member.project_id, 
        )
        return await MemberSnapshotRepo(db).get_latest_member_snapshot(member_id)
    
    @staticmethod
    def complexity_to_points(complexity) -> int:
        """
        Convert a task complexity (enum member or string) to contribution points.
        Low=1, Medium=2, High=3. Unknown or missing complexity gives 0.
        """
        key = str(getattr(complexity, "value", complexity) or "").strip().lower()
        return COMPLEXITY_POINTS.get(key, 0)

    @staticmethod
    async def add_contribution_points(
        db: AsyncSession, member_id: UUID, points: int
    ) -> MemberSnapshot | None:
        """
        Add `points` to a member's contribution total (pass a negative value to
        take points back, e.g. when a submission is rejected after completion).

        The running total is read from the member's latest snapshot, adjusted,
        clamped at 0, and written to today's snapshot.
        """
        if points == 0:
            return await MemberSnapshotRepo(db).get_latest_member_snapshot(member_id)

        repo = MemberSnapshotRepo(db)
        latest = await repo.get_latest_member_snapshot(member_id)
        current = latest.contribution_points if latest else 0
        new_total = max(current + points, 0)

        return await repo.upsert_today_member_snapshot(
            member_id, MemberSnapshotUpsert(contribution_points=new_total)
        )

