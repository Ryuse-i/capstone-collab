from uuid import UUID
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_async_session
from app.modules.resource_links.schema import (
    ResourceLinkCreate,
    ResourceLinkResponse,
    ResourceLinkUpdate,
)
from app.modules.resource_links.services import ResourceLinkService
from app.modules.users.model import User
from app.modules.users.services import current_active_user

resource_link_router = APIRouter()


@resource_link_router.post(
    "/resources/{resource_id}",
    response_model=ResourceLinkResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_link(
    resource_id: UUID,
    data: ResourceLinkCreate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    return await ResourceLinkService.add(db, resource_id, data, current_user.id)


@resource_link_router.get("/resources/{resource_id}", response_model=list[ResourceLinkResponse])
async def list_links(
    resource_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    return await ResourceLinkService.get_by_resource(db, resource_id)


@resource_link_router.patch("/{link_id}", response_model=ResourceLinkResponse)
async def update_link(
    link_id: UUID,
    data: ResourceLinkUpdate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    return await ResourceLinkService.update(db, link_id, data, current_user.id)


@resource_link_router.delete("/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_link(
    link_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    await ResourceLinkService.delete(db, link_id, current_user.id)
    return None