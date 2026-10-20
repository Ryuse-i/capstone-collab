from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_async_session
from app.modules.resources.schema import ResourceCategory, ResourceResponse
from app.modules.resources.services import ResourceService
from app.modules.users.model import User
from app.modules.users.services import current_active_user
from app.modules.resources.schema import (
    ResourceCategory,
    ResourceResponse,
    ResourceUpdate,
)

class ResourceUrlResponse(BaseModel):
    url: str

resources_router = APIRouter()


@resources_router.get("/projects/{project_id}", response_model=list[ResourceResponse])
async def list_project_resources(
    project_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    return await ResourceService.list_for_project(db, project_id, current_user)


@resources_router.patch("/{resource_id}", response_model=ResourceResponse)
async def update_resource(
    resource_id: UUID,
    title: str | None = Form(default=None),
    category: ResourceCategory | None = Form(default=None),
    description: str | None = Form(default=None),
    pinned: bool | None = Form(default=None),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    return await ResourceService.update(
        db,
        resource_id,
        current_user,
        title=title,
        category=category,
        description=description,
        pinned=pinned,
    )

@resources_router.post("/{resource_id}/open", )
async def open_resource(
    resource_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    return ResourceUrlResponse(
        url=await ResourceService.open_resource(db, resource_id, current_user)
    )

@resources_router.patch("/{resource_id}", response_model=ResourceResponse)
async def update_resource(
    resource_id: UUID,
    payload: ResourceUpdate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    return await ResourceService.update(
        db,
        resource_id,
        current_user,
        **payload.model_dump(exclude_unset=True),
    )

@resources_router.delete("/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resource(
    resource_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    await ResourceService.delete(db, resource_id, current_user)
    return None