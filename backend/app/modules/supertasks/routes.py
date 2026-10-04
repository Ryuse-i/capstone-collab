from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_async_session
from app.modules.supertasks.schema import (
    SupertaskCreate,
    SupertaskResponse,
    SupertaskUpdate,
)
from app.modules.supertasks.services import SupertaskService
from app.modules.users.model import User
from app.modules.users.services import current_active_user

supertask_router = APIRouter()


async def _get_supertask_or_404(
    db: AsyncSession,
    supertask_id: UUID,
):
    db_item = await SupertaskService.get_one_supertask(db, supertask_id)

    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supertask not found",
        )

    return db_item


@supertask_router.get(
    "/project/{project_id}",
    response_model=list[SupertaskResponse],
)
async def get_project_supertasks(
    project_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    return await SupertaskService.get_project_supertasks(
        db,
        project_id,
    )


@supertask_router.get(
    "/{supertask_id}",
    response_model=SupertaskResponse,
)
async def get_one_supertask(
    supertask_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    return await _get_supertask_or_404(
        db,
        supertask_id,
    )


@supertask_router.post(
    "/",
    response_model=SupertaskResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_supertask(
    data: SupertaskCreate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    return await SupertaskService.create_supertask(
        db,
        data,
        current_user.id,
    )


@supertask_router.patch(
    "/{supertask_id}",
    response_model=SupertaskResponse,
)
async def update_supertask(
    supertask_id: UUID,
    data: SupertaskUpdate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    db_item = await _get_supertask_or_404(
        db,
        supertask_id,
    )

    return await SupertaskService.update_supertask(
        db,
        db_item,
        data,
    )


@supertask_router.delete(
    "/{supertask_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_supertask(
    supertask_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    db_item = await _get_supertask_or_404(
        db,
        supertask_id,
    )

    await SupertaskService.delete_supertask(
        db,
        db_item,
    )

    return None
