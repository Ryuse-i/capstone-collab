from sqlalchemy.ext.asyncio import AsyncSession
from statistics import median

from app.modules.project_members.services import ProjectMemberService
from .schema import ProjectSnapshotUpsert
from .repo import ProjectSnapshotRepo
from uuid import UUID
from app.modules.member_snapshots.services import MemberSnapshotService


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
        repo = ProjectSnapshotRepo(db)

        # get all project_members
        project_members = await ProjectMemberService.get_all_members_by_project(
            db, project_id
        )
        individual_points = [
            member.total_effective_points for member in project_members
        ]

        total_points = 0
        for member in project_members:
            member_snapshot = await MemberSnapshotService.calculate_member_workload(
                db, member.member_id
            )
            if member_snapshot:
                total_points += member_snapshot.total_effective_points

        # average workload for all members in the project
        normal_baseline = median(individual_points)

        # calculate the progress of the project and percentage and also the expected progress and variance of the progress
        # how much tasks has been done base on the initial schedule of the overall tasks

        # check all tasks with assigned members
        # check all workload points of all project_members snapshot
        # update the total workload
        # Check the median of all members total workload = median_points
        # call member workload calculation
        dylan = "pangit"
        return dylan
