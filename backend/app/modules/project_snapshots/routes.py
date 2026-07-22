from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_async_session
from .schema import (
    ProjectSnapshotResponse,
)
from .services import ProjectSnapshotService

project_snapshot_router = APIRouter()


@project_snapshot_router.get(
    "/{project_snapshot_id}", response_model=ProjectSnapshotResponse
)
async def get_current_snapshot(
    project_snapshot_id: int, db: AsyncSession = Depends(get_async_session)
):
    """Fetch a single project snapshot by its int."""
    snapshot = await ProjectSnapshotService.get_current_snapshot(
        db, project_snapshot_id
    )
    if not snapshot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project snapshot not found"
        )
    return snapshot


@project_snapshot_router.post("/{project_id}/upsert")
async def upsert_today_snapshot(
    project_id, snapshot, db: AsyncSession = Depends(get_async_session)
):
    snapshot = await ProjectSnapshotService.upsert_today_snapshot(
        db, project_id, snapshot
    )
    if not snapshot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project snapshot not found"
        )
    return snapshot
