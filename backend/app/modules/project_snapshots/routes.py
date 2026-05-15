from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_async_session
from .schema import (
    ProjectSnapshotCreate,
    ProjectSnapshotResponse,
    ProjectSnapshotUpdate,
)
from .services import ProjectSnapshotService
from uuid import UUID

project_snapshot_router = APIRouter()


@project_snapshot_router.get("/{project_id}", response_model=ProjectSnapshotResponse)
async def get_current_snapshot(
    project_snapshot_id: UUID, db: AsyncSession = Depends(get_async_session)
):
    db_item = await ProjectSnapshotService.get_current_snapshot(db, project_snapshot_id)
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )
    return db_item


@project_snapshot_router.post(
    "/", response_model=ProjectSnapshotResponse, status_code=status.HTTP_201_CREATED
)
async def create_snapshot(
    project_snapshot: ProjectSnapshotCreate,
    db: AsyncSession = Depends(get_async_session),
):
    return await ProjectSnapshotService.create_snapshot(db, project_snapshot)


@project_snapshot_router.patch(
    "/{project_snapshot_id}", response_model=ProjectSnapshotResponse
)
async def update_project(
    project_snapshot_id: UUID,
    project: ProjectSnapshotUpdate,
    db: AsyncSession = Depends(get_async_session),
):
    db_item = await ProjectSnapshotService.get_current_snapshot(db, project_snapshot_id)
    return await ProjectSnapshotService.update_snapshot(db, db_item, project)
