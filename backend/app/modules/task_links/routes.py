from uuid import UUID
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_async_session
from app.modules.task_links.schema import (
    TaskLinkCreate,
    TaskLinkResponse,
    TaskLinkUpdate,
)
from app.modules.task_links.services import TaskLinkService
from app.modules.users.model import User
from app.modules.users.services import current_active_user

task_link_router = APIRouter()


@task_link_router.post(
    "/tasks/{task_id}",
    response_model=TaskLinkResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_link(
    task_id: UUID,
    data: TaskLinkCreate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    return await TaskLinkService.add(db, task_id, data, current_user.id)


@task_link_router.get("/tasks/{task_id}", response_model=list[TaskLinkResponse])
async def list_links(
    task_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    return await TaskLinkService.get_by_task(db, task_id)


@task_link_router.patch("/{link_id}", response_model=TaskLinkResponse)
async def update_link(
    link_id: UUID,
    data: TaskLinkUpdate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    return await TaskLinkService.update(db, link_id, data, current_user.id)


@task_link_router.delete("/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_link(
    link_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    await TaskLinkService.delete(db, link_id, current_user.id)
    return None