from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_async_session
from app.modules.tasks.schema import (
    TaskCreate,
    TaskResponseWithMembers,
    TaskUpdate,
    TaskResponse,
)
from app.modules.tasks.services import TaskService
from uuid import UUID
from typing import List
from app.modules.users.services import current_active_user
from app.modules.users.model import User
from app.modules.admin.activity_service import ActivityLogService
from app.modules.tasks.enums import Status

# Standardizing on task_router
task_router = APIRouter()


@task_router.get("/", response_model=List[TaskResponse])
async def get_all_tasks(
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    """Fetch all tasks from the database."""
    return await TaskService.get_all_tasks(db)


@task_router.get("/projects/{project_id}", response_model=list[TaskResponse])
async def get_all_project_tasks(
    project_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    return await TaskService.get_all_project_tasks(db, project_id)


@task_router.get("/{task_id}", response_model=TaskResponse)
async def get_one_task(task_id: UUID, db: AsyncSession = Depends(get_async_session)):
    """Fetch a single task by its UUID."""
    db_item = await TaskService.get_one_task(db, task_id)
    if not db_item:
        # Crucial for test assertions like 'assert response.status_code == 404'
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Task not found"
        )
    return db_item


@task_router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    task: TaskCreate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    """Create a new task. Returns 201 Created on success."""
    created = await TaskService.create_task(db, task)
    await ActivityLogService.record(
        db,
        event_type="task_created",
        actor_id=current_user.id,
        target_type="task",
        target_id=created.id,
        details={"target_label": created.name},
    )
    return created


@task_router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: UUID,
    task: TaskUpdate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    """Partially update an existing task."""
    db_item = await TaskService.get_one_task(db, task_id)
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Task not found"
        )
    previous_status = db_item.status
    updated = await TaskService.update_task(db, db_item, task)
    event_type = "task_updated"
    if previous_status != updated.status and updated.status == Status.SUBMITTED:
        event_type = "task_submitted"
    elif previous_status != updated.status and updated.status == Status.COMPLETED:
        event_type = "task_completed"
    await ActivityLogService.record(
        db,
        event_type=event_type,
        actor_id=current_user.id,
        target_type="task",
        target_id=updated.id,
        details={"target_label": updated.name},
    )
    return updated


@task_router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    """Delete a task. Returns 204 No Content on success."""
    # 1. Fetch the item to verify existence
    db_item = await TaskService.get_one_task(db, task_id)

    # 2. Raise 404 if the task doesn't exist
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Task not found"
        )

    # 3. Perform the delete and AWAIT the service call
    task_name = db_item.name
    await TaskService.delete_task(db, db_item)
    await ActivityLogService.record(
        db,
        event_type="task_deleted",
        actor_id=current_user.id,
        target_type="task",
        target_id=task_id,
        details={"target_label": task_name},
    )
    return None


@task_router.get(
    "/assigned-members/{project_id}", response_model=list[TaskResponseWithMembers]
)
async def get_assigned_members(
    project_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    return await TaskService.get_assigned_members(db, project_id)


@task_router.get(
    "/assigned-members/user/{user_id}", response_model=list[TaskResponseWithMembers]
)
async def get_tasks_for_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    return await TaskService.get_tasks_for_user(db, user_id)
