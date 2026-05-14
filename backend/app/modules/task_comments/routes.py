from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_async_session
from app.modules.task_comments.schema import TaskCommentCreate, TaskCommentUpdate, TaskCommentResponse
from app.modules.task_comments.services import TaskCommentService
from typing import List

# Standardizing on task_comment_router
task_comment_router = APIRouter()


@task_comment_router.get("/", response_model=List[TaskCommentResponse])
async def get_all_task_comments(db: AsyncSession = Depends(get_async_session)):
    """Fetch all task comments from the database."""
    return await TaskCommentService.get_all_task_comments(db)


@task_comment_router.get("/{task_comment_id}", response_model=TaskCommentResponse)
async def get_one_task_comment(task_comment_id: int, db: AsyncSession = Depends(get_async_session)):
    """Fetch a single task comment by its ID."""
    db_item = await TaskCommentService.get_one_task_comment(db, task_comment_id)
    if not db_item:
        # Crucial for test assertions like 'assert response.status_code == 404'
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Task comment not found"
        )
    return db_item


@task_comment_router.post("/", response_model=TaskCommentResponse, status_code=status.HTTP_201_CREATED)
async def create_task_comment(task_comment: TaskCommentCreate, db: AsyncSession = Depends(get_async_session)):
    """Create a new task comment. Returns 201 Created on success."""
    return await TaskCommentService.create_task_comment(db, task_comment)


@task_comment_router.patch("/{task_comment_id}", response_model=TaskCommentResponse)
async def update_task_comment(
    task_comment_id: int,
    task_comment: TaskCommentUpdate,
    db: AsyncSession = Depends(get_async_session),
):
    """Partially update an existing task comment."""
    db_item = await TaskCommentService.get_one_task_comment(db, task_comment_id)
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Task comment not found"
        )
    return await TaskCommentService.update_task_comment(db, db_item, task_comment)


@task_comment_router.delete("/{task_comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task_comment(
    task_comment_id: int,
    db: AsyncSession = Depends(get_async_session),
):
    """Delete a task comment. Returns 204 No Content on success."""
    # 1. Fetch the item to verify existence
    db_item = await TaskCommentService.get_one_task_comment(db, task_comment_id)

    # 2. Raise 404 if the task comment doesn't exist
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Task comment not found"
        )

    # 3. Perform the delete and AWAIT the service call
    await TaskCommentService.delete_task_comment(db, db_item)
    return None
