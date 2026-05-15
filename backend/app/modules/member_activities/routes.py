from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_async_session
from .schema import MemberActivityCreate, MemberActivityUpdate, MemberActivityResponse
from .services import MemberActivityService
from typing import List

# Standardizing on assigned_member_router
member_activity_route = APIRouter()


@member_activity_route.get("/", response_model=List[MemberActivityResponse])
async def get_all_member_activitys(db: AsyncSession = Depends(get_async_session)):
    """Fetch all assigned members from the database."""
    return await MemberActivityService.get_all_member_activities(db)


@member_activity_route.get(
    "/{member_activity_id}", response_model=MemberActivityResponse
)
async def get_one_member_activity(
    member_activity_id: int, db: AsyncSession = Depends(get_async_session)
):
    """Fetch a single assigned member by its int."""
    db_item = await MemberActivityService.get_one_member_activity(
        db, member_activity_id
    )
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Assigned member not found"
        )
    return db_item


@member_activity_route.post(
    "/", response_model=MemberActivityResponse, status_code=status.HTTP_201_CREATED
)
async def create_member_activity(
    member_activity: MemberActivityCreate, db: AsyncSession = Depends(get_async_session)
):
    """Create a new assigned member. Returns 201 Created on success."""
    return await MemberActivityService.create_member_activity(db, member_activity)


@member_activity_route.patch(
    "/{member_activity_id}", response_model=MemberActivityResponse
)
async def update_member_activity(
    member_activity_id: int,
    member_activity: MemberActivityUpdate,
    db: AsyncSession = Depends(get_async_session),
):
    """Partially update an existing assigned member."""
    db_item = await MemberActivityService.get_one_member_activity(
        db, member_activity_id
    )
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Assigned member not found"
        )
    return await MemberActivityService.update_member_activity(
        db, db_item, member_activity
    )


@member_activity_route.delete(
    "/{member_activity_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def delete_member_activity(
    member_activity_id: int,
    db: AsyncSession = Depends(get_async_session),
):
    """Delete an assigned member. Returns 204 No Content on success."""
    db_item = await MemberActivityService.get_one_member_activity(
        db, member_activity_id
    )

    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Assigned member not found"
        )

    await MemberActivityService.delete_member_activity(db, db_item)
    return None
