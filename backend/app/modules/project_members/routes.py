from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_async_session
from .schema import (
    ProjectMemberResponse,
    ProjectMemberUpdate,
    ProjectMemberCreate,
)
from .services import ProjectMemberService
from uuid import UUID
from typing import List

project_member_router = APIRouter()


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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )
    return db_item


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
    return await ProjectMemberService.update_member(db, db_item, project_member)


@project_member_router.delete("/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project_member(
    member_id: UUID,
    db: AsyncSession = Depends(get_async_session),
):
    db_item = await ProjectMemberService.get_one_member(db, member_id)
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )
    await ProjectMemberService.delete_member(db, db_item)
    return None
