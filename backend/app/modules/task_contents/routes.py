from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_async_session
from app.modules.task_contents.schema import (
    TaskContentCreate,
    TaskContentUpdate,
    TaskContentResponse,
)
from app.modules.task_contents.services import TaskContentService
from uuid import UUID
from typing import List

task_content_router = APIRouter()


@task_content_router.get("/", response_model=List[TaskContentResponse])
async def get_all_task_contents(db: AsyncSession = Depends(get_async_session)):
    """Fetch all task contents from the database."""
    return await TaskContentService.get_all_contents(db)


@task_content_router.get("/{content_id}", response_model=TaskContentResponse)
async def get_one_content(
    content_id: UUID, db: AsyncSession = Depends(get_async_session)
):
    """Fetch a single task content by its UUID."""
    db_item = await TaskContentService.get_one_content(db, content_id)
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Task content not found"
        )
    return db_item


@task_content_router.post(
    "/", response_model=TaskContentResponse, status_code=status.HTTP_201_CREATED
)
async def create_task_content(
    content: TaskContentCreate, db: AsyncSession = Depends(get_async_session)
):
    """Create a new task content. Returns 201 Created on success."""
    return await TaskContentService.create_content(db, content)


@task_content_router.patch("/{content_id}", response_model=TaskContentResponse)
async def update_content(
    content_id: UUID,
    content: TaskContentUpdate,
    db: AsyncSession = Depends(get_async_session),
):
    """Partially update an existing task content."""
    db_item = await TaskContentService.get_one_content(db, content_id)
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Task content not found"
        )
    return await TaskContentService.update_content(db, db_item, content)


@task_content_router.delete("/{content_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_content(
    content_id: UUID,
    db: AsyncSession = Depends(get_async_session),
):
    """Delete a task content. Returns 204 No Content on success."""
    db_item = await TaskContentService.get_one_content(db, content_id)
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Task content not found"
        )
    await TaskContentService.delete_content(db, db_item)
    return None
