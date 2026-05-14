from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_async_session
from app.modules.task_tags.schema import TagCreate, TagUpdate, TagResponse, TaskTagCreate, TaskTagUpdate, TaskTagResponse
from app.modules.task_tags.services import TagService, TaskTagService
from uuid import UUID
from typing import List

# Standardizing on tag_router and task_tag_router
tag_router = APIRouter()
task_tag_router = APIRouter()


@tag_router.get("/", response_model=List[TagResponse])
async def get_all_tags(db: AsyncSession = Depends(get_async_session)):
    """Fetch all tags from the database."""
    return await TagService.get_all_tags(db)


@tag_router.get("/{tag_id}", response_model=TagResponse)
async def get_one_tag(tag_id: UUID, db: AsyncSession = Depends(get_async_session)):
    """Fetch a single tag by its UUID."""
    db_item = await TagService.get_one_tag(db, tag_id)
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found"
        )
    return db_item


@tag_router.post("/", response_model=TagResponse, status_code=status.HTTP_201_CREATED)
async def create_tag(tag: TagCreate, db: AsyncSession = Depends(get_async_session)):
    """Create a new tag. Returns 201 Created on success."""
    return await TagService.create_tag(db, tag)


@tag_router.patch("/{tag_id}", response_model=TagResponse)
async def update_tag(
    tag_id: UUID,
    tag: TagUpdate,
    db: AsyncSession = Depends(get_async_session),
):
    """Partially update an existing tag."""
    db_item = await TagService.get_one_tag(db, tag_id)
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found"
        )
    return await TagService.update_tag(db, db_item, tag)


@tag_router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tag(
    tag_id: UUID,
    db: AsyncSession = Depends(get_async_session),
):
    """Delete a tag. Returns 204 No Content on success."""
    db_item = await TagService.get_one_tag(db, tag_id)

    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found"
        )

    await TagService.delete_tag(db, db_item)
    return None


@task_tag_router.get("/", response_model=List[TaskTagResponse])
async def get_all_task_tags(db: AsyncSession = Depends(get_async_session)):
    """Fetch all task tags from the database."""
    return await TaskTagService.get_all_task_tags(db)


@task_tag_router.get("/{task_tag_id}", response_model=TaskTagResponse)
async def get_one_task_tag(task_tag_id: int, db: AsyncSession = Depends(get_async_session)):
    """Fetch a single task tag by its ID."""
    db_item = await TaskTagService.get_one_task_tag(db, task_tag_id)
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Task tag not found"
        )
    return db_item


@task_tag_router.post("/", response_model=TaskTagResponse, status_code=status.HTTP_201_CREATED)
async def create_task_tag(task_tag: TaskTagCreate, db: AsyncSession = Depends(get_async_session)):
    """Create a new task tag. Returns 201 Created on success."""
    return await TaskTagService.create_task_tag(db, task_tag)


@task_tag_router.patch("/{task_tag_id}", response_model=TaskTagResponse)
async def update_task_tag(
    task_tag_id: int,
    task_tag: TaskTagUpdate,
    db: AsyncSession = Depends(get_async_session),
):
    """Partially update an existing task tag."""
    db_item = await TaskTagService.get_one_task_tag(db, task_tag_id)
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Task tag not found"
        )
    return await TaskTagService.update_task_tag(db, db_item, task_tag)


@task_tag_router.delete("/{task_tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task_tag(
    task_tag_id: int,
    db: AsyncSession = Depends(get_async_session),
):
    """Delete a task tag. Returns 204 No Content on success."""
    db_item = await TaskTagService.get_one_task_tag(db, task_tag_id)

    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Task tag not found"
        )

    await TaskTagService.delete_task_tag(db, db_item)
    return None
