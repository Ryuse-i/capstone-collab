from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.orm import joinedload
from sqlalchemy.orm import contains_eager
from app.core.base_repo import BaseRepo
from app.modules.projects.model import Project
from app.modules.project_snapshots.model import ProjectSnapshot


class ProjectRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, Project)

    async def get_by_creator(self, user_id) -> Project | None:
        query = select(Project).where(Project.created_by == user_id).limit(1)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_creator_with_latest_snapshot(self, user_id) -> Project | None:
        latest_date_subq = (
            select(func.max(ProjectSnapshot.snapshot_date))
            .where(ProjectSnapshot.project_id == Project.id)
            .correlate(Project)
            .scalar_subquery()
        )

        query = (
            select(Project)
            .outerjoin(
                ProjectSnapshot,
                (ProjectSnapshot.project_id == Project.id)
                & (ProjectSnapshot.snapshot_date == latest_date_subq),
            )
            .where(Project.created_by == user_id)
            .options(contains_eager(Project.snapshots))
            .limit(1)
        )
        result = await self.db.execute(query.execution_options(populate_existing=True))
        return result.unique().scalar_one_or_none()

    async def get_by_id_with_snapshot(self, project_id: UUID) -> Project | None:
        query = (
            select(Project)
            .where(Project.id == project_id)
            .options(joinedload(Project.snapshots))
            .limit(1)
        )
        result = await self.db.execute(query)
        return result.unique().scalar_one_or_none()

    async def get_projects_for_instructor(self, user_id: UUID) -> list[Project]:
        query = select(Project).where(
            (Project.instructor == user_id) | (Project.advisor == user_id)
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_projects_for_user_with_snapshot(self, user_id: UUID) -> list[Project]:
        query = (
            select(Project)
            .where((Project.instructor == user_id) | (Project.advisor == user_id))
            .options(joinedload(Project.snapshots))
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())
