from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_async_session
from .schema import (
    ProjectSnapshotResponse,
    ProjectSnapshotUpdate,
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
    db_item = await ProjectSnapshotService.get_current_snapshot(db, project_snapshot_id)
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project snapshot not found"
        )
    return db_item


@project_snapshot_router.patch(
    "/{project_snapshot_id}", response_model=ProjectSnapshotResponse
)
async def update_snapshot(
    project_snapshot_id: int,
    project: ProjectSnapshotUpdate,
    db: AsyncSession = Depends(get_async_session),
):
    """Partially update an existing project snapshot."""
    db_item = await ProjectSnapshotService.get_current_snapshot(db, project_snapshot_id)
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project snapshot not found"
        )
    return await ProjectSnapshotService.update_snapshot(db, db_item, project)
