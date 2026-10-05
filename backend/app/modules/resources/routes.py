from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_async_session
from app.modules.resources.schema import ResourceCategory, ResourceResponse, ResourceUrlResponse
from app.modules.resources.services import ResourceService
from app.modules.users.model import User
from app.modules.users.services import current_active_user

resources_router = APIRouter()


@resources_router.get("/projects/{project_id}", response_model=list[ResourceResponse])
async def list_project_resources(
    project_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    return await ResourceService.list_for_project(db, project_id, current_user)


@resources_router.post(
    "/projects/{project_id}",
    response_model=ResourceResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_project_resource(
    project_id: UUID,
    title: str = Form(...),
    category: ResourceCategory = Form(...),
    description: str = Form(...),
    source_url: str | None = Form(default=None),
    attachment: UploadFile | None = File(default=None),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    return await ResourceService.create(
        db,
        project_id=project_id,
        user=current_user,
        title=title,
        category=category,
        description=description,
        source_url=source_url,
        attachment=attachment,
    )


@resources_router.post("/{resource_id}/open", response_model=ResourceUrlResponse)
async def open_resource(
    resource_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    return ResourceUrlResponse(
        url=await ResourceService.open_resource(db, resource_id, current_user)
    )


@resources_router.delete("/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resource(
    resource_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    await ResourceService.delete(db, resource_id, current_user)
    return None