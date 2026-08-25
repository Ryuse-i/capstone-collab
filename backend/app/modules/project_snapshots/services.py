from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.project_members.services import ProjectMemberService
from .schema import ProjectSnapshotUpsert
from .repo import ProjectSnapshotRepo
from uuid import UUID


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
        
        #get all project_members
        project_members = await ProjectMemberService.get_all_members_by_project(db, project_id)

        #get all assigned member with tasks attached
          
        
        # check all tasks with assigned members
        # check all workload points of all project_members snapshot
        # update the total workload
        # Check the median of all members total workload = median_points
        # call member workload calculation
        dylan = "pangit"
        return dylan
