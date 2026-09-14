from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_async_session
from .schema import MemberSnapshotResponse, MemberSnapshotUpsert
from .services import MemberSnapshotService
from typing import List
from uuid import UUID

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


@member_snapshot_route.get("/{member_id}/latest")
async def get_latest_member_snapshot(
    member_id: UUID, db: AsyncSession = Depends(get_async_session)
):
    return await MemberSnapshotService.get_latest_snapshot(db, member_id)


@member_snapshot_route.patch("/{member_snapshot_id}", response_model=MemberSnapshotResponse)
async def update_member_snapshot(
    member_snapshot_id: int,
    snapshot: MemberSnapshotUpsert,
    db: AsyncSession = Depends(get_async_session)
):
    """Update an existing member snapshot."""
    db_item = await MemberSnapshotService.get_one_member_snapshot(
        db, member_snapshot_id
    )
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Member snapshot not found"
        )

    # Update the snapshot with new values
    update_data = snapshot.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_item, field, value)

    return db_item


@member_snapshot_route.post("/{member_id}/upsert")
async def upsert_today_snapshot(
    member_id: UUID,
    snapshot: MemberSnapshotUpsert,
    db: AsyncSession = Depends(get_async_session)
):
    snapshot = await MemberSnapshotService.upsert_today_member_snapshot(
        db, member_id, snapshot
    )
    if not snapshot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Member snapshot not found"
        )
    await db.commit()
    # DEBUG: Fresh SELECT after commit
    from sqlalchemy import select
    from .model import MemberSnapshot
    fresh_result = await db.execute(select(MemberSnapshot).where(MemberSnapshot.member_id == member_id).order_by(MemberSnapshot.snapshot_date.desc()).limit(1))
    fresh_snapshot = fresh_result.scalar_one_or_none()
    print(f"DEBUG UPSERT: after commit, member_id={member_id}, fresh capacity_multiplier={getattr(fresh_snapshot, "capacity_multiplier", "None") if fresh_snapshot else "None"}")
    return snapshot


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
