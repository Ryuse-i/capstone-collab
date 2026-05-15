from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_async_session
from app.modules.projects.schema import (
    ProjectCreate,
    ProjectResponse,
    ProjectUpdate,
)
from app.modules.projects.services import ProjectService
from uuid import UUID
from typing import List

project_router = APIRouter()
project_member_router = APIRouter()


@project_router.get("/", response_model=List[ProjectResponse])
async def get_all_projects(db: AsyncSession = Depends(get_async_session)):
    return await ProjectService.get_all_projects(db)


@project_router.get("/{project_id}", response_model=ProjectResponse)
async def get_one_project(
    project_id: UUID, db: AsyncSession = Depends(get_async_session)
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
    project: ProjectCreate, db: AsyncSession = Depends(get_async_session)
):
    return await ProjectService.create_project(db, project)


@project_router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: UUID,
    project: ProjectUpdate,
    db: AsyncSession = Depends(get_async_session),
):
    db_item = await ProjectService.get_one_project(db, project_id)
    return await ProjectService.update_project(db, db_item, project)


@project_router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_async_session),
):
    db_item = await ProjectService.get_one_project(db, project_id)
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )
    await ProjectService.delete_project(db, db_item)
    return None
