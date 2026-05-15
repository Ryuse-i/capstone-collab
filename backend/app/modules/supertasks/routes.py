from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_async_session
from app.modules.supertasks.schema import (
    SupertaskCreate,
    SupertaskResponse,
    SupertaskUpdate,
)
from app.modules.supertasks.services import SupertaskService
from uuid import UUID
from typing import List

supertask_router = APIRouter()


@supertask_router.get("/", response_model=List[SupertaskResponse])
async def get_all_tasks(db: AsyncSession = Depends(get_async_session)):
    """Fetch all tasks from the database."""
    return await SupertaskService.get_all_tasks(db)


@supertask_router.get("/{task_id}", response_model=SupertaskResponse)
async def get_one_task(task_id: UUID, db: AsyncSession = Depends(get_async_session)):
    """Fetch a single task by its UUID."""
    db_item = await SupertaskService.get_one_task(db, task_id)
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Task not found"
        )
    return db_item


@supertask_router.post(
    "/", response_model=SupertaskResponse, status_code=status.HTTP_201_CREATED
)
async def create_task(
    task: SupertaskCreate, db: AsyncSession = Depends(get_async_session)
):
    """Create a new task. Returns 201 Created on success."""
    return await SupertaskService.create_task(db, task)


@supertask_router.patch("/{task_id}", response_model=SupertaskResponse)
async def update_task(
    task_id: UUID,
    task: SupertaskUpdate,
    db: AsyncSession = Depends(get_async_session),
):
    """Partially update an existing task."""
    db_item = await SupertaskService.get_one_task(db, task_id)
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Task not found"
        )
    return await SupertaskService.update_task(db, db_item, task)


@supertask_router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: UUID,
    db: AsyncSession = Depends(get_async_session),
):
    """Delete a task. Returns 204 No Content on success."""
    db_item = await SupertaskService.get_one_task(db, task_id)
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Task not found"
        )
    await SupertaskService.delete_task(db, db_item)
    return None
