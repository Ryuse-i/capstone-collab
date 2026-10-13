from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.resource_links.repo import ResourceLinkRepo
from app.modules.resource_links.schema import (
    ResourceLinkCreate,
    ResourceLinkInsert,
    ResourceLinkUpdate,
)
from app.modules.resources.services import ResourceService


class ResourceLinkService:
    @staticmethod
    async def add(
        db: AsyncSession, resource_id: UUID, data: ResourceLinkCreate, user_id: UUID
    ):
        resource = await ResourceService.get_resource(db, resource_id)
        if not resource:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Resource not found")

        repo = ResourceLinkRepo(db)
        created = await repo.create(
            ResourceLinkInsert(
                resource_id=resource_id,
                created_by=user_id,
                url=data.url,
                title=data.title,
            )
        )
        return await repo.get_with_creator(created.id)

    @staticmethod
    async def get_by_resource(db: AsyncSession, resource_id: UUID):
        repo = ResourceLinkRepo(db)
        return await repo.get_by_resource(resource_id)

    @staticmethod
    async def _get_owned(repo: ResourceLinkRepo, link_id: UUID, user_id: UUID):
        """Fetch a link and make sure the current user is the one who added it."""
        link = await repo.get_by_id(link_id)
        if not link:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Link not found")
        if link.created_by != user_id:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN, "Only the user who added this link can modify it"
            )
        return link

    @staticmethod
    async def update(
        db: AsyncSession, link_id: UUID, data: ResourceLinkUpdate, user_id: UUID
    ):
        repo = ResourceLinkRepo(db)
        link = await ResourceLinkService._get_owned(repo, link_id, user_id)
        await repo.update(link, data)
        return await repo.get_with_creator(link_id)

    @staticmethod
    async def delete(db: AsyncSession, link_id: UUID, user_id: UUID):
        repo = ResourceLinkRepo(db)
        link = await ResourceLinkService._get_owned(repo, link_id, user_id)
        return await repo.delete(link)