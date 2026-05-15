from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_async_session
from app.modules.task_relations.schema import TaskRelationCreate, TaskRelationUpdate, TaskRelationResponse
from app.modules.task_relations.services import TaskRelationService
from typing import List

# Standardizing on task_relation_router
task_relation_router = APIRouter()


@task_relation_router.get("/", response_model=List[TaskRelationResponse])
async def get_all_task_relations(db: AsyncSession = Depends(get_async_session)):
    """Fetch all task relations from the database."""
    return await TaskRelationService.get_all_task_relations(db)


@task_relation_router.get("/{task_relation_id}", response_model=TaskRelationResponse)
async def get_one_task_relation(task_relation_id: int, db: AsyncSession = Depends(get_async_session)):
    """Fetch a single task relation by its ID."""
    db_item = await TaskRelationService.get_one_task_relation(db, task_relation_id)
    if not db_item:
        # Crucial for test assertions like 'assert response.status_code == 404'
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Task relation not found"
        )
    return db_item


@task_relation_router.post("/", response_model=TaskRelationResponse, status_code=status.HTTP_201_CREATED)
async def create_task_relation(task_relation: TaskRelationCreate, db: AsyncSession = Depends(get_async_session)):
    """Create a new task relation. Returns 201 Created on success."""
    return await TaskRelationService.create_task_relation(db, task_relation)


@task_relation_router.patch("/{task_relation_id}", response_model=TaskRelationResponse)
async def update_task_relation(
    task_relation_id: int,
    task_relation: TaskRelationUpdate,
    db: AsyncSession = Depends(get_async_session),
):
    """Partially update an existing task relation."""
    db_item = await TaskRelationService.get_one_task_relation(db, task_relation_id)
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Task relation not found"
        )
    return await TaskRelationService.update_task_relation(db, db_item, task_relation)


@task_relation_router.delete("/{task_relation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task_relation(
    task_relation_id: int,
    db: AsyncSession = Depends(get_async_session),
):
    """Delete a task relation. Returns 204 No Content on success."""
    # 1. Fetch the item to verify existence
    db_item = await TaskRelationService.get_one_task_relation(db, task_relation_id)

    # 2. Raise 404 if the task relation doesn't exist
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Task relation not found"
        )

    # 3. Perform the delete and AWAIT the service call
    await TaskRelationService.delete_task_relation(db, db_item)
    return None
