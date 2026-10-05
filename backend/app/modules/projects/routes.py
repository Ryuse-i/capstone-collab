from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_async_session
from app.modules.projects.schema import (
    ProjectCreate,
    ProjectResponse,
    ProjectUpdate,
    ProjectResponseSnapshot,
)
from app.modules.projects.services import ProjectService
from uuid import UUID
from typing import List
from app.modules.users.services import current_active_user
from app.modules.users.model import User
from app.modules.admin.activity_service import ActivityLogService

project_router = APIRouter()
project_member_router = APIRouter()


@project_router.get("/snapshot/{project_id}")
async def get_by_id_with_snapshot(
    project_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    return await ProjectService.get_by_id_with_snapshot(db, project_id)


@project_router.get("/", response_model=List[ProjectResponse])
async def get_all_projects(
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    return await ProjectService.get_all_projects(db)


@project_router.get("/me/roles")
async def get_projects_for_current_user(
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    """Return the projects where the current user is instructor or advisor."""
    return await ProjectService.get_projects_for_instructor(db, current_user.id)


@project_router.get("/{project_id}", response_model=ProjectResponse)
async def get_one_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    db_item = await ProjectService.get_one_project(db, project_id)
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )
    return db_item


@project_router.post(
    "/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED
)
async def create_project(
    project: ProjectCreate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    created = await ProjectService.create_project(db, project)
    await ActivityLogService.record(
        db,
        event_type="project_created",
        actor_id=current_user.id,
        target_type="project",
        target_id=created.id,
        details={"target_label": created.name},
    )
    return created


@project_router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: UUID,
    project: ProjectUpdate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    db_item = await ProjectService.get_one_project(db, project_id)
    updated = await ProjectService.update_project(db, db_item, project)
    await ActivityLogService.record(
        db,
        event_type="project_updated",
        actor_id=current_user.id,
        target_type="project",
        target_id=updated.id,
        details={"target_label": updated.name},
    )
    return updated


@project_router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    db_item = await ProjectService.get_one_project(db, project_id)
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )
    project_name = db_item.name
    await ProjectService.delete_project(db, db_item)
    await ActivityLogService.record(
        db,
        event_type="project_deleted",
        actor_id=current_user.id,
        target_type="project",
        target_id=project_id,
        details={"target_label": project_name},
    )
    return None


@project_router.get("/user/{user_id}", response_model=ProjectResponse)
async def get_user_project(
    user_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    """
    Fetch a project belonging to the specified user.
    """
    project = await ProjectService.get_project_by_user(db, user_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No project found for this user.",
        )
    return project


@project_router.get("/user/{user_id}/all", response_model=list[ProjectResponse])
async def get_instructor_project(
    user_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    project = await ProjectService.get_projects_for_instructor(db, user_id)
    return project


@project_router.get(
    "/user/{user_id}/all-with-snapshot", response_model=list[ProjectResponseSnapshot]
)
async def get_instructor_project_with_snapshot(
    user_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    project = await ProjectService.get_projects_for_instructor_with_snapshot(
        db, user_id
    )
    return project
