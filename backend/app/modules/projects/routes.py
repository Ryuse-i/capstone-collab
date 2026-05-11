from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_async_session
from app.modules.projects.schema import (
    ProjectCreate,
    ProjectResponse,
    ProjectUpdate,
    ProjectMemberResponse,
    ProjectMemberUpdate,
    ProjectMemberCreate,
)
from app.modules.projects.services import ProjectService, ProjectMemberService
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
        # This is what makes your test pass 'assert verify_res.status_code == 404'
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )
    return db_item


@project_router.post("/", response_model=ProjectResponse)
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


@project_router.delete("/{project_id}")
async def delete_project(
    project_id: UUID,  # Ensure this matches your ID type (UUID)
    db: AsyncSession = Depends(get_async_session),
):
    # 1. Fetch the item
    db_item = await ProjectService.get_one_project(db, project_id)

    # 2. Check if it exists before trying to delete
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    # 3. Perform the delete and AWAIT it
    return await ProjectService.delete_project(db, db_item)


# project member routes
@project_member_router.get("/", response_model=List[ProjectMemberResponse])
async def get_all_members(db: AsyncSession = Depends(get_async_session)):
    return await ProjectMemberService.get_all_members(db)


@project_member_router.get("/{member_id}", response_model=ProjectMemberResponse)
async def get_one_project_member(
    member_id: UUID, db: AsyncSession = Depends(get_async_session)
):
    db_item = await ProjectMemberService.get_one_member(db, member_id)
    if not db_item:
        # This is what makes your test pass 'assert verify_res.status_code == 404'
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )
    return db_item


@project_member_router.post("/", response_model=ProjectMemberResponse)
async def create_project_member(
    project_member: ProjectMemberCreate, db: AsyncSession = Depends(get_async_session)
):
    return await ProjectMemberService.add_member(db, project_member)


@project_member_router.patch("/{member_id}", response_model=ProjectMemberResponse)
async def update_project_member(
    member_id: UUID,
    project_member: ProjectMemberUpdate,
    db: AsyncSession = Depends(get_async_session),
):
    db_item = await ProjectMemberService.get_one_member(db, member_id)
    return await ProjectMemberService.update_member(db, db_item, project_member)


@project_member_router.delete("/{member_id}")
async def delete_project_member(
    member_id: UUID,  # Ensure this matches your ID type (UUID)
    db: AsyncSession = Depends(get_async_session),
):
    # 1. Fetch the item
    db_item = await ProjectMemberService.get_one_member(db, member_id)

    # 2. Check if it exists before trying to delete
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    # 3. Perform the delete and AWAIT it
    return await ProjectMemberService.delete_member(db, db_item)
