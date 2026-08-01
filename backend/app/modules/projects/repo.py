from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.core.base_repo import BaseRepo
from app.modules.projects.model import Project


class ProjectRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, Project)

    async def get_by_creator(self, user_id) -> Project | None:
        query = select(Project).where(Project.created_by == user_id).limit(1)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_creator_with_snapshot(self, user_id) -> Project | None:
        query = (
            select(Project)
            .where(Project.created_by == user_id)
            .options(joinedload(Project.snapshot))
            .limit(1)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_id_with_snapshot(self, project_id: UUID) -> Project | None:
        query = (
            select(Project)
            .where(Project.id == project_id)
            .options(joinedload(Project.snapshot))
            .limit(1)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
