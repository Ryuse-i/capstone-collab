"""
app/modules/workload_balance/router.py

Register in your main app, e.g.:
    from app.modules.workload_balance.router import workload_balance_router
    app.include_router(workload_balance_router, prefix="/workload-balance", tags=["Workload Balance"])
"""
from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_async_session
from app.modules.users.model import User
from app.modules.users.services import current_active_user

from .schema import WorkloadBalanceResponse, WorkloadBalanceSummary
from .services import WorkloadBalanceService

workload_balance_router = APIRouter()


@workload_balance_router.get("/{project_id}", response_model=WorkloadBalanceSummary)
async def get_workload_balance(
    project_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    """Latest persisted balance score + severity. No recompute."""
    summary = await WorkloadBalanceService.get_latest(db, project_id)
    if summary is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No snapshot for this project"
        )
    return summary


@workload_balance_router.post("/{project_id}/recalculate", response_model=WorkloadBalanceResponse)
async def recalculate_workload_balance(
    project_id: UUID,
    today: date | None = Query(None, description="Override today's date for testing"),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    """Recompute, persist, and return the full breakdown (spread / overload / severity)."""
    try:
        response = await WorkloadBalanceService.recalculate(db, project_id, today=today)
        await db.commit()
    except Exception:
        await db.rollback()
        raise
    return response