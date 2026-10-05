from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.base_repo import BaseRepo
from app.modules.resources.model import Resource


class ResourceRepo(BaseRepo):
    def __init__(self, db: AsyncSession):
        super().__init__(db, Resource)

    async def get_by_id_with_relations(self, resource_id: UUID) -> Resource | None:
        result = await self.db.execute(
            select(Resource)
            .options(selectinload(Resource.file), selectinload(Resource.creator))
            .where(Resource.id == resource_id)
        )
        return result.scalar_one_or_none()

    async def get_by_project(self, project_id: UUID) -> list[Resource]:
        result = await self.db.execute(
            select(Resource)
            .options(selectinload(Resource.file), selectinload(Resource.creator))
            .where(Resource.project_id == project_id)
            .order_by(Resource.pinned.desc(), Resource.updated_at.desc(), Resource.id)
        )
        return list(result.scalars().all())