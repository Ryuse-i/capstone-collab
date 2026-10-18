from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_async_session
from app.modules.users.model import User
from app.modules.users.services import current_active_user
from .schema import MemberActivityResponse
from .services import MemberActivityService

member_activity_route = APIRouter()


@member_activity_route.get(
    "/projects/{project_id}", response_model=list[MemberActivityResponse]
)
async def get_project_activity(
    project_id: UUID,
    limit: int = Query(20, ge=1, le=100),
    before: datetime | None = None,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    """Newest-first activity feed. Page with ?before=<created_at of last item>."""
    is_admin = getattr(current_user, "is_superuser", False)
    if not is_admin and not await MemberActivityService.is_project_member(
        db, current_user.id, project_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this project",
        )
    return await MemberActivityService.get_project_activity(
        db, project_id, limit, before
    )