from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_async_session
from app.modules.projects.schema import ProjectResponseSnapshot

from .schema import (
    ProjectMemberCreate,
    ProjectMemberDetailResponse,
    ProjectMemberResponse,
    ProjectMemberUpdate,
    ProjectMember_Project_Response,
    ProjectMember_User_Response,
)
from .services import ProjectMemberService


project_member_router = APIRouter()

# =====================================================================
# 1. SPECIFIC / LITERAL PATHS FIRST
# =====================================================================


@project_member_router.get("/", response_model=List[ProjectMemberResponse])
async def get_all_members(db: AsyncSession = Depends(get_async_session)):
    return await ProjectMemberService.get_all_members(db)


@project_member_router.get("/detail", response_model=List[ProjectMemberDetailResponse])
async def get_all_members_detail(db: AsyncSession = Depends(get_async_session)):
    return await ProjectMemberService.get_all_members(db)


# =====================================================================
# 2. DYNAMIC / PARAMETERIZED PATHS LAST
# =====================================================================


@project_member_router.get("/{member_id}", response_model=ProjectMemberResponse)
async def get_one_project_member(
    member_id: UUID, db: AsyncSession = Depends(get_async_session)
):
    member = await ProjectMemberService.get_one_member(db, member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    return member


@project_member_router.get("/detail/{user_id}", response_model=ProjectMemberDetailResponse)
async def get_one_project_member_detail(
    user_id: UUID, db: AsyncSession = Depends(get_async_session)
):
    member = await ProjectMemberService.get_member_by_user_id(db, user_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    return member


@project_member_router.get(
    "/projects/{user_id}", response_model=list[ProjectMember_Project_Response]
)
async def get_all_projects_by_member(
    user_id: UUID, db: AsyncSession = Depends(get_async_session)
):
    projects = await ProjectMemberService.get_all_projects_by_member(db, user_id)
    return projects


@project_member_router.get(
    "/users/{project_id}", response_model=list[ProjectMember_User_Response]
)
async def get_all_members_by_project(
    project_id: UUID, db: AsyncSession = Depends(get_async_session)
):
    members = await ProjectMemberService.get_all_members_by_project(db, project_id)
    return members


@project_member_router.get(
    "/{user_id}/projects/{project_id}/with-snapshot",
    response_model=ProjectResponseSnapshot,
)
async def get_project_for_member_with_snapshot(
    user_id: UUID,
    project_id: UUID,
    db: AsyncSession = Depends(get_async_session),
):
    project = await ProjectMemberService.get_project_for_member_with_snapshot(
        db, user_id, project_id
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found for this member")
    return project


@project_member_router.post(
    "/", response_model=ProjectMemberResponse, status_code=status.HTTP_201_CREATED
)
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
    if not db_item:
        raise HTTPException(status_code=404, detail="Member not found")
    return await ProjectMemberService.update_member(db, db_item, project_member)


@project_member_router.delete("/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project_member(
    member_id: UUID, db: AsyncSession = Depends(get_async_session)
):
    db_item = await ProjectMemberService.get_one_member(db, member_id)
    if not db_item:
        raise HTTPException(status_code=404, detail="Member not found")
    await ProjectMemberService.delete_member(db, db_item)
