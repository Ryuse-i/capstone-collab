"""
routes.py  -> app/modules/dashboard/routes.py

Register in the main api router file (the one with api_router.include_router(...)):

    from app.modules.dashboard.routes import dashboard_router
    api_router.include_router(dashboard_router, prefix="/dashboard", tags=["dashboard"])
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_async_session
from app.modules.users.model import User
from app.modules.users.services import current_active_user

from .schema import InstructorDashboardResponse
from .services import DashboardService

dashboard_router = APIRouter()


@dashboard_router.get("/instructor", response_model=InstructorDashboardResponse)
async def get_instructor_dashboard(
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    """Everything the instructor/advisor dashboard shows, for the current user."""
    return await DashboardService.get_instructor_dashboard(db, current_user.id)