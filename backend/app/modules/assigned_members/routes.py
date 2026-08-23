from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.status import HTTP_201_CREATED
from app.core.db import get_async_session
from app.modules.assigned_members.schema import (
    AssignedMemberCreate,
    AssignedMemberUpdate,
    AssignedMemberResponse,
)
from app.modules.assigned_members.services import AssignedMemberService
from app.modules.users.schema import UserResponse
from app.modules.users.model import User
from app.modules.users.services import current_active_user
from uuid import UUID
from typing import List

# Standardizing on assigned_member_router
assigned_member_router = APIRouter()


@assigned_member_router.get("/", response_model=List[AssignedMemberResponse])
async def get_all_assigned_members(db: AsyncSession = Depends(get_async_session)):
    """Fetch all assigned members from the database."""
    return await AssignedMemberService.get_all_assigned_members(db)


@assigned_member_router.get(
    "/{assigned_member_id}", response_model=AssignedMemberResponse
)
async def get_one_assigned_member(
    assigned_member_id: UUID, db: AsyncSession = Depends(get_async_session)
):
    """Fetch a single assigned member by its UUID."""
    db_item = await AssignedMemberService.get_one_assigned_member(
        db, assigned_member_id
    )
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Assigned member not found"
        )
    return db_item


@assigned_member_router.post(
    "/", response_model=AssignedMemberResponse, status_code=status.HTTP_201_CREATED
)
async def create_assigned_member(
    assigned_member: AssignedMemberCreate, db: AsyncSession = Depends(get_async_session)
):
    """Create a new assigned member. Returns 201 Created on success."""
    return await AssignedMemberService.create_assigned_member(db, assigned_member)


@assigned_member_router.patch(
    "/{assigned_member_id}", response_model=AssignedMemberResponse
)
async def update_assigned_member(
    assigned_member_id: UUID,
    assigned_member: AssignedMemberUpdate,
    db: AsyncSession = Depends(get_async_session),
):
    """Partially update an existing assigned member."""
    db_item = await AssignedMemberService.get_one_assigned_member(
        db, assigned_member_id
    )
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Assigned member not found"
        )
    return await AssignedMemberService.update_assigned_member(
        db, db_item, assigned_member
    )


@assigned_member_router.delete(
    "/{assigned_member_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def delete_assigned_member(
    assigned_member_id: UUID,
    db: AsyncSession = Depends(get_async_session),
):
    """Delete an assigned member. Returns 204 No Content on success."""
    db_item = await AssignedMemberService.get_one_assigned_member(
        db, assigned_member_id
    )

    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Assigned member not found"
        )

    await AssignedMemberService.delete_assigned_member(db, db_item)
    return None


@assigned_member_router.post(
    "/batch", response_model=list[UserResponse], status_code=HTTP_201_CREATED
)
async def batch_create_members(
    members: list[AssignedMemberCreate],
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    return AssignedMemberService.batch_create_members(db, members)


@assigned_member_router.get("/task/{task_id}", response_model=list[UserResponse])
async def get_task_members(
    task_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    return await AssignedMemberService.get_task_members(db, task_id)
