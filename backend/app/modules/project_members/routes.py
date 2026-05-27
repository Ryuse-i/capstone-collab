from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_async_session
from .schema import (
    ProjectMemberResponse,
    ProjectMember_Project_Reponse,
    ProjectMember_User_Reponse,
    ProjectMemberUpdate,
    ProjectMemberCreate,
)
from .services import ProjectMemberService
from uuid import UUID

# TODO put invitations into another module

project_member_router = APIRouter()


@project_member_router.get("/{member_id}", response_model=ProjectMemberResponse)
async def get_one_project_member(
    member_id: UUID, db: AsyncSession = Depends(get_async_session)
):
    member = await ProjectMemberService.get_one_member(db, member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    return member


@project_member_router.get("/detail/{user_id}", response_model=ProjectMemberResponse)
async def get_one_project_member_detail(
    user_id: UUID, db: AsyncSession = Depends(get_async_session)
):
    member = await ProjectMemberService.get_one_member(db, user_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    return member


@project_member_router.get(
    "/projects/{user_id}", response_model=list[ProjectMember_Project_Reponse]
)
async def get_all_projects_by_member(
    user_id, db: AsyncSession = Depends(get_async_session)
):
    projects = await ProjectMemberService.get_all_projects_by_member(db, user_id)
    return projects


@project_member_router.get(
    "/users/{project_id}", response_model=list[ProjectMember_User_Reponse]
)
async def get_all_members_by_project(
    project_id, db: AsyncSession = Depends(get_async_session)
):
    members = await ProjectMemberService.get_all_members_by_project(db, project_id)
    return members


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
