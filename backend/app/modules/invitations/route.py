from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_async_session
from .schema import (
    ProjectInvitationResponse,
    ProjectInvitationCreate,
    ProjectInvitationUpdate,
)
from .service import ProjectInvitationService
from uuid import UUID
from typing import List

project_invitation_router = APIRouter()


@project_invitation_router.get("/", response_model=List[ProjectInvitationResponse])
async def get_all_invitations(db: AsyncSession = Depends(get_async_session)):
    return await ProjectInvitationService.get_all_invitations(db)


@project_invitation_router.get(
    "/{invitation_id}", response_model=ProjectInvitationResponse
)
async def get_one_invitation(
    invitation_id: UUID, db: AsyncSession = Depends(get_async_session)
):
    invitation = await ProjectInvitationService.get_one_invitation(db, invitation_id)
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")
    return invitation


@project_invitation_router.post(
    "/",
    response_model=ProjectInvitationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_invitation(
    invitation: ProjectInvitationCreate, db: AsyncSession = Depends(get_async_session)
):
    return await ProjectInvitationService.create_invitation(db, invitation)


@project_invitation_router.patch(
    "/{invitation_id}", response_model=ProjectInvitationResponse
)
async def update_invitation(
    invitation_id: UUID,
    invitation: ProjectInvitationUpdate,
    db: AsyncSession = Depends(get_async_session),
):
    db_item = await ProjectInvitationService.get_one_invitation(db, invitation_id)
    if not db_item:
        raise HTTPException(status_code=404, detail="Invitation not found")
    return await ProjectInvitationService.update_invitation(db, db_item, invitation)


@project_invitation_router.post(
    "/{invitation_id}/accept", response_model=ProjectInvitationResponse
)
async def accept_invitation(
    invitation_id: UUID, db: AsyncSession = Depends(get_async_session)
):
    invitation = await ProjectInvitationService.accept_invitation(db, invitation_id)
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")
    return invitation


@project_invitation_router.post(
    "/{invitation_id}/decline", response_model=ProjectInvitationResponse
)
async def decline_invitation(
    invitation_id: UUID, db: AsyncSession = Depends(get_async_session)
):
    invitation = await ProjectInvitationService.decline_invitation(db, invitation_id)
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")
    return invitation


@project_invitation_router.delete(
    "/{invitation_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def delete_invitation(
    invitation_id: UUID, db: AsyncSession = Depends(get_async_session)
):
    db_item = await ProjectInvitationService.get_one_invitation(db, invitation_id)
    if not db_item:
        raise HTTPException(status_code=404, detail="Invitation not found")
    await ProjectInvitationService.delete_invitation(db, db_item)
