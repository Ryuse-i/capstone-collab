from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.status import HTTP_201_CREATED
from app.core.db import get_async_session
from app.modules.assigned_reviewer.schema import (
    AssignedReviewerCreate,
    AssignedReviewerUpdate,
    AssignedReviewerResponse,
)
from app.modules.assigned_reviewer.services import AssignedReviewerService
from app.modules.users.schema import UserResponse
from app.modules.users.model import User
from app.modules.users.services import current_active_user
from uuid import UUID
from typing import List, Sequence

# Standardizing on assigned_reviewer_router
assigned_reviewer_router = APIRouter()


@assigned_reviewer_router.get("/", response_model=List[AssignedReviewerResponse])
async def get_all_assigned_reviewers(db: AsyncSession = Depends(get_async_session)):
    """Fetch all assigned reviewers from the database."""
    return await AssignedReviewerService.get_all_assigned_reviewers(db)


@assigned_reviewer_router.get(
    "/{assigned_reviewer_id}", response_model=AssignedReviewerResponse
)
async def get_one_assigned_reviewer(
    assigned_reviewer_id: UUID, db: AsyncSession = Depends(get_async_session)
):
    """Fetch a single assigned reviewer by its UUID."""
    db_item = await AssignedReviewerService.get_one_assigned_reviewer(
        db, assigned_reviewer_id
    )
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Assigned reviewer not found"
        )
    return db_item


@assigned_reviewer_router.post(
    "/", response_model=AssignedReviewerResponse, status_code=status.HTTP_201_CREATED
)
async def create_assigned_reviewer(
    assigned_reviewer: AssignedReviewerCreate, db: AsyncSession = Depends(get_async_session)
):
    """Create a new assigned reviewer. Returns 201 Created on success."""
    return await AssignedReviewerService.create_assigned_reviewer(db, assigned_reviewer)


@assigned_reviewer_router.patch(
    "/{assigned_reviewer_id}", response_model=AssignedReviewerResponse
)
async def update_assigned_reviewer(
    assigned_reviewer_id: UUID,
    assigned_reviewer: AssignedReviewerUpdate,
    db: AsyncSession = Depends(get_async_session),
):
    """Partially update an existing assigned reviewer."""
    db_item = await AssignedReviewerService.get_one_assigned_reviewer(
        db, assigned_reviewer_id
    )
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Assigned reviewer not found"
        )
    return await AssignedReviewerService.update_assigned_reviewer(
        db, db_item, assigned_reviewer
    )


@assigned_reviewer_router.delete(
    "/{assigned_reviewer_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def delete_assigned_reviewer(
    assigned_reviewer_id: UUID,
    db: AsyncSession = Depends(get_async_session),
):
    """Delete an assigned reviewer. Returns 204 No Content on success."""
    db_item = await AssignedReviewerService.get_one_assigned_reviewer(
        db, assigned_reviewer_id
    )

    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Assigned reviewer not found"
        )

    await AssignedReviewerService.delete_assigned_reviewer(db, db_item)
    return None


@assigned_reviewer_router.get("/task/{task_id}", response_model=List[AssignedReviewerResponse])
async def get_task_reviewers(
    task_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    return await AssignedReviewerService.get_task_reviewers(db, task_id)


@assigned_reviewer_router.get("/member/{member_id}", response_model=List[AssignedReviewerResponse])
async def get_reviewers_by_member(
    member_id: UUID,
    db: AsyncSession = Depends(get_async_session),
):
    return await AssignedReviewerService.get_reviewers(db, member_id)