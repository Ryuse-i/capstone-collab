from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_async_session
from app.modules.task_submissions.schema import TaskSubmissionCreate, TaskSubmissionUpdate, TaskSubmissionResponse
from app.modules.task_submissions.services import TaskSubmissionService
from uuid import UUID
from typing import List

# Standardizing on task_submission_router
task_submission_router = APIRouter()


@task_submission_router.get("/", response_model=List[TaskSubmissionResponse])
async def get_all_task_submissions(db: AsyncSession = Depends(get_async_session)):
    """Fetch all task submissions from the database."""
    return await TaskSubmissionService.get_all_task_submissions(db)


@task_submission_router.get("/{task_submission_id}", response_model=TaskSubmissionResponse)
async def get_one_task_submission(task_submission_id: UUID, db: AsyncSession = Depends(get_async_session)):
    """Fetch a single task submission by its UUID."""
    db_item = await TaskSubmissionService.get_one_task_submission(db, task_submission_id)
    if not db_item:
        # Crucial for test assertions like 'assert response.status_code == 404'
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Task submission not found"
        )
    return db_item


@task_submission_router.post("/", response_model=TaskSubmissionResponse, status_code=status.HTTP_201_CREATED)
async def create_task_submission(task_submission: TaskSubmissionCreate, db: AsyncSession = Depends(get_async_session)):
    """Create a new task submission. Returns 201 Created on success."""
    return await TaskSubmissionService.create_task_submission(db, task_submission)


@task_submission_router.patch("/{task_submission_id}", response_model=TaskSubmissionResponse)
async def update_task_submission(
    task_submission_id: UUID,
    task_submission: TaskSubmissionUpdate,
    db: AsyncSession = Depends(get_async_session),
):
    """Partially update an existing task submission."""
    db_item = await TaskSubmissionService.get_one_task_submission(db, task_submission_id)
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Task submission not found"
        )
    return await TaskSubmissionService.update_task_submission(db, db_item, task_submission)


@task_submission_router.delete("/{task_submission_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task_submission(
    task_submission_id: UUID,
    db: AsyncSession = Depends(get_async_session),
):
    """Delete a task submission. Returns 204 No Content on success."""
    # 1. Fetch the item to verify existence
    db_item = await TaskSubmissionService.get_one_task_submission(db, task_submission_id)

    # 2. Raise 404 if the task submission doesn't exist
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Task submission not found"
        )

    # 3. Perform the delete and AWAIT the service call
    await TaskSubmissionService.delete_task_submission(db, db_item)
    return None
