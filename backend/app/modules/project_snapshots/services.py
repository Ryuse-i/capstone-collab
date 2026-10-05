from sqlalchemy.ext.asyncio import AsyncSession
from statistics import median

from app.modules.project_members.services import ProjectMemberService
from decimal import Decimal
from .schema import ProjectSnapshotUpsert
from .repo import ProjectSnapshotRepo
from uuid import UUID
from app.modules.member_snapshots.services import MemberSnapshotService
from app.modules.project_snapshots.recalculate_project_workload import COUNTED_ROLES, MemberWorkloadInput, to_decimal_2, compute_project_workload, round_half_up_int, compute_project_total
from app.modules.redistribution_recommendations.workload_calculation import calculate_member_workload_totals
from app.modules.member_snapshots.schema import MemberSnapshotUpsert




class ProjectSnapshotService:
    @staticmethod
    async def get_current_snapshot(db: AsyncSession, project_snapshot_id):
        repo = ProjectSnapshotRepo(db)
        return await repo.get_by_id(project_snapshot_id)

    @staticmethod
    async def get_latest_snapshot(db: AsyncSession, project_snapshot_id):
        repo = ProjectSnapshotRepo(db)
        return await repo.get_latest_snapshot(project_snapshot_id)

    @staticmethod
    async def upsert_today_snapshot(
        db: AsyncSession, project_id: UUID | None, snapshot: ProjectSnapshotUpsert
    ):
        if project_id is None:
            return None

        repo = ProjectSnapshotRepo(db)
        return await repo.upsert_today_snapshot(project_id, snapshot)

    @staticmethod
    async def calculate_project_workload(db: AsyncSession, project_id: UUID):
        """
        Recompute workload for every counted member of a project, then persist.

        Order matters: totals for ALL members first, then the median baseline,
        then statuses, so nothing is evaluated against a stale snapshot.
        """
        members = await ProjectMemberService.get_all_members_by_project(db, project_id)
        counted = [m for m in members if m.role in COUNTED_ROLES]  # no ADVISOR/INSTRUCTOR
        if not counted:
            return []

        # 1. Fresh totals for everyone (idle members come back as 0 and stay in the median)
        inputs = []
        for m in counted:
            total_points, total_effective = await calculate_member_workload_totals(db, m.id)
            inputs.append(MemberWorkloadInput(
                member_id=m.id,
                total_points=to_decimal_2(total_points),
                total_effective_points=to_decimal_2(total_effective),
                capacity_multiplier=Decimal(str(m.capacity_multiplier)),
                silence_warning=bool(m.silence_warning),
            ))

        # 2. Median baseline, expected_load and status, computed in one pass
        results = compute_project_workload(inputs)

        # 3. Persist every member snapshot
        for r in results:
            await MemberSnapshotService.upsert_today_member_snapshot(
                db, r.member_id,
                MemberSnapshotUpsert(
                    total_effective_points=r.total_effective_points,
                    workload_status=r.status,
                ),
            )

        # 4. Project total = sum of members, rounded once (no delta)
        await ProjectSnapshotService.upsert_today_snapshot(
            db, project_id,
            ProjectSnapshotUpsert(
                total_workload_points=round_half_up_int(compute_project_total(results))
            ),
        )

        # 5. TODO: progress %, expected progress and variance (needs the files below)

        await db.commit()
        return results
    
    @staticmethod
    async def sync_unassigned_tasks(db: AsyncSession, project_id: UUID):
        repo = ProjectSnapshotRepo(db)
        count = await repo.count_unassigned_tasks(project_id)
        snapshot = ProjectSnapshotUpsert(unassigned_tasks=count)
        return await repo.upsert_today_snapshot(project_id, snapshot)