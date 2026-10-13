from uuid import UUID
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.base_repo import BaseRepo
from app.modules.resource_links.model import ResourceLink


class ResourceLinkRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, ResourceLink)

    async def get_with_creator(self, link_id: UUID):
        stmt = (
            select(ResourceLink)
            .where(ResourceLink.id == link_id)
            .options(selectinload(ResourceLink.creator))
            .execution_options(populate_existing=True)
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def get_by_resource(self, resource_id: UUID):
        stmt = (
            select(ResourceLink)
            .where(ResourceLink.resource_id == resource_id)
            .options(selectinload(ResourceLink.creator))
            .order_by(ResourceLink.created_at.desc())
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()