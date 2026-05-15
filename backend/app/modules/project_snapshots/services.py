from sqlalchemy.ext.asyncio import AsyncSession
from .schema import ProjectSnapshotCreate, ProjectSnapshotUpdate
from .repo import ProjectSnapshotRepo


class ProjectSnapshotService:
    @staticmethod
    async def get_current_snapshot(db: AsyncSession, project_snapshot_id):
        repo = ProjectSnapshotRepo(db)
        return await repo.get_by_id(project_snapshot_id)

    @staticmethod
    async def create_snapshot(
        db: AsyncSession, project_snapshot: ProjectSnapshotCreate
    ):
        repo = ProjectSnapshotRepo(db)
        return await repo.create(project_snapshot)

    @staticmethod
    async def update_snapshot(
        db: AsyncSession,
        db_item: ProjectSnapshotUpdate,
        project_snapshot: ProjectSnapshotUpdate,
    ):
        repo = ProjectSnapshotRepo(db)
        return await repo.update(db_item, project_snapshot)
