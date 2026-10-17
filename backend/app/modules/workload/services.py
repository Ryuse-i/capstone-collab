"""
app/modules/workload_balance/services.py

Thin layer over workload_math.compute_workload_balance. Does NOT redo workload math:
it reuses ProjectSnapshotService.calculate_project_workload (which already returns
result.balance), then maps + persists the balance onto today's project snapshot.

Does not commit. The router (or whatever owns the transaction) commits.
Import direction: workload_balance -> project_snapshots, never the reverse
(if project_snapshots needs this, import lazily inside the function).
"""
from __future__ import annotations

from dataclasses import asdict
from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.project_snapshots.model import Severity
from app.modules.project_snapshots.schema import ProjectSnapshotUpsert
from app.modules.project_snapshots.services import ProjectSnapshotService
from app.modules.redistribution_recommendations import workload_math as wm

from .schema import WorkloadBalanceResponse, WorkloadBalanceSummary

# Score is 0-100, higher = healthier. Tune in ONE place.
HEALTHY_MIN = Decimal("70")   # >= 70 -> LOW imbalance
MODERATE_MIN = Decimal("40")  # >= 40 -> MEDIUM, below -> HIGH


def severity_from_score(score: Decimal | None) -> Severity:
    """Not applicable (no members / all work done) counts as LOW so a stale HIGH never lingers."""
    if score is None or score >= HEALTHY_MIN:
        return Severity.LOW
    if score >= MODERATE_MIN:
        return Severity.MEDIUM
    return Severity.HIGH


class WorkloadBalanceService:
    @staticmethod
    def build_response(balance: wm.WorkloadBalance) -> WorkloadBalanceResponse:
        return WorkloadBalanceResponse(
            **asdict(balance),
            imbalance_severity=severity_from_score(balance.score),
        )

    @staticmethod
    async def recalculate(
        db: AsyncSession,
        project_id: UUID,
        *,
        today: date | None = None,
        config: wm.WorkloadConfig | None = None,
    ) -> WorkloadBalanceResponse:
        """Recompute, persist workload_balance + imbalance_severity, return the breakdown."""
        result = await ProjectSnapshotService.calculate_project_workload(
            db, project_id, today=today, config=config
        )
        response = WorkloadBalanceService.build_response(result.balance)

        # Partial upsert: the repo must apply exclude_unset so other columns stay untouched.
        await ProjectSnapshotService.upsert_today_snapshot(
            db,
            project_id,
            ProjectSnapshotUpsert(
                workload_balance=response.score,
                imbalance_severity=response.imbalance_severity,
            ),
        )
        return response

    @staticmethod
    async def get_latest(db: AsyncSession, project_id: UUID) -> WorkloadBalanceSummary | None:
        snap = await ProjectSnapshotService.get_latest_snapshot(db, project_id)
        if snap is None:
            return None
        return WorkloadBalanceSummary(
            project_id=snap.project_id,
            workload_balance=snap.workload_balance,
            imbalance_severity=snap.imbalance_severity,
            snapshot_date=snap.snapshot_date,
        )