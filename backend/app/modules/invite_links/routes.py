from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_async_session
from app.modules.users.model import User
from app.modules.users.services import current_active_user

from .schema import (
    InviteLinkCreate,
    InviteLinkCreated,
    InviteLinkResponse,
    InviteLinkPreview,
    InviteLinkAccepted,
)
from .services import ProjectInviteLinkService

invite_link_router = APIRouter()


@invite_link_router.post(
    "/", response_model=InviteLinkCreated, status_code=status.HTTP_201_CREATED
)
async def create_invite_link(
    data: InviteLinkCreate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    return await ProjectInviteLinkService.create_link(db, data, current_user)


@invite_link_router.get("/project/{project_id}", response_model=List[InviteLinkResponse])
async def list_project_invite_links(
    project_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    return await ProjectInviteLinkService.list_active(db, project_id, current_user)


# public: no auth, so the invite page can render before login
@invite_link_router.get("/preview/{token}", response_model=InviteLinkPreview)
async def preview_invite_link(
    token: str,
    db: AsyncSession = Depends(get_async_session),
):
    return await ProjectInviteLinkService.preview(db, token)


@invite_link_router.post("/accept/{token}", response_model=InviteLinkAccepted)
async def accept_invite_link(
    token: str,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    return await ProjectInviteLinkService.accept(db, token, current_user)


@invite_link_router.delete("/{link_id}", response_model=InviteLinkResponse)
async def revoke_invite_link(
    link_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    return await ProjectInviteLinkService.revoke(db, link_id, current_user)