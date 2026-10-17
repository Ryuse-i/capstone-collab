"""
router.py  -> app/modules/project_health/router.py

Read-only endpoint for the Project Health score. Diagnostic only: it recommends nothing and
changes nothing (spec 8.3). The service neither writes nor commits, so there is no
commit/rollback here.

Mount it in your app, for example:
    app.include_router(project_health_router, prefix="/project-health", tags=["project-health"])

Lines marked  # ASSUMPTION  depend on your project; adjust the names.
"""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_async_session
from app.modules.projects.model import Project  # ASSUMPTION: same model _lock_project uses
from app.modules.users.model import User
from app.modules.users.services import current_active_user

from .schema import ProjectHealthResponse
from .project_health_service import ProjectHealthService

project_health_router = APIRouter()


@project_health_router.get(
    "/{project_id}",
    response_model=ProjectHealthResponse,
    summary="Current project health",
)
async def get_project_health(
    project_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    """
    Current health of one project: a 0-100 score, its status (Healthy / Watch / At Risk),
    and the four sub-scores (schedule, workload balance, risk, activity) with the metrics
    behind them. Calculated on request from live tasks and the latest member snapshots.
    """
    # ASSUMPTION: add your project-access check here (member of the project, or instructor).
    if await db.get(Project, project_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    health = await ProjectHealthService.calculate_project_health(db, project_id)
    return ProjectHealthResponse.model_validate(health)