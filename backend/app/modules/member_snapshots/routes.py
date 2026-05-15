from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_async_session
from .schema import MemberSnapshotCreate, MemberSnapshotUpdate, MemberSnapshotResponse
from .services import MemberSnapshotService
from typing import List

member_snapshot_route = APIRouter()


@member_snapshot_route.get("/", response_model=List[MemberSnapshotResponse])
async def get_all_member_snapshots(db: AsyncSession = Depends(get_async_session)):
    """Fetch all assigned members from the database."""
    return await MemberSnapshotService.get_all_member_snapshots(db)


@member_snapshot_route.get(
    "/{member_snapshot_id}", response_model=MemberSnapshotResponse
)
async def get_one_member_snapshot(
    member_snapshot_id: int, db: AsyncSession = Depends(get_async_session)
):
    """Fetch a single assigned member by its UUID."""
    db_item = await MemberSnapshotService.get_one_member_snapshot(
        db, member_snapshot_id
    )
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Assigned member not found"
        )
    return db_item


@member_snapshot_route.post(
    "/", response_model=MemberSnapshotResponse, status_code=status.HTTP_201_CREATED
)
async def create_member_snapshot(
    member_snapshot: MemberSnapshotCreate, db: AsyncSession = Depends(get_async_session)
):
    """Create a new assigned member. Returns 201 Created on success."""
    return await MemberSnapshotService.create_member_snapshot(db, member_snapshot)


@member_snapshot_route.patch(
    "/{member_snapshot_id}", response_model=MemberSnapshotResponse
)
async def update_member_snapshot(
    member_snapshot_id: int,
    member_snapshot: MemberSnapshotUpdate,
    db: AsyncSession = Depends(get_async_session),
):
    """Partially update an existing assigned member."""
    db_item = await MemberSnapshotService.get_one_member_snapshot(
        db, member_snapshot_id
    )
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Assigned member not found"
        )
    return await MemberSnapshotService.update_member_snapshot(
        db, db_item, member_snapshot
    )


@member_snapshot_route.delete(
    "/{member_snapshot_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def delete_member_snapshot(
    member_snapshot_id: int,
    db: AsyncSession = Depends(get_async_session),
):
    """Delete an assigned member. Returns 204 No Content on success."""
    db_item = await MemberSnapshotService.get_one_member_snapshot(
        db, member_snapshot_id
    )

    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Assigned member not found"
        )

    await MemberSnapshotService.delete_member_snapshot(db, db_item)
    return None
