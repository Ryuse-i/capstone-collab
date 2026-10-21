from datetime import date, datetime
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert

from app.core.base_repo import BaseRepo

from .model import ProjectSnapshot
from .schema import ProjectSnapshotUpsert

APP_TZ = ZoneInfo("Asia/Manila")

# Fields copied from the most recent earlier snapshot when a new day's row is
# created. unassigned_tasks is NOT here: it is recomputed fresh on insert.
CARRY_FIELDS = (
    "total_workload_points",
    "avg_workload",
    "progress_score",
    "progress_percentage",
    "expected_score",
    "expected_percentage",
    "schedule_variance",
    "workload_balance",
    "imbalance_severity",
    "health_score",
    "health_status",
)
CONFLICT_COLS = ["project_id", "snapshot_date"]


def today_local() -> date:
    return datetime.now(APP_TZ).date()


class ProjectSnapshotRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, ProjectSnapshot)

    async def upsert_today_snapshot(
        self, project_id: UUID, metrics: ProjectSnapshotUpsert
    ):
        today = today_local()

        # only fields explicitly sent; never touch the keys
        updates = metrics.model_dump(
            exclude_unset=True, exclude={"project_id", "snapshot_date"}
        )

        # carry forward from the latest snapshot strictly before today
        latest = await self.get_latest_snapshot_before(project_id, today)
        carried = (
            {
                f: v
                for f in CARRY_FIELDS
                if (v := getattr(latest, f)) is not None
            }
            if latest
            else {}
        )

        # fresh value for a new row; only used on INSERT, never in set_
        fresh = {"unassigned_tasks": await self.count_unassigned_tasks(project_id)}

        stmt = insert(ProjectSnapshot).values(
            project_id=project_id,
            snapshot_date=today,
            **{**carried, **fresh, **updates},  # updates win
        )
        if updates:
            stmt = stmt.on_conflict_do_update(
                index_elements=CONFLICT_COLS, set_=updates
            )
        else:
            stmt = stmt.on_conflict_do_nothing(index_elements=CONFLICT_COLS)

        result = await self.db.execute(stmt.returning(ProjectSnapshot))
        snapshot = result.scalar_one_or_none()

        # DO NOTHING returns no row on conflict, so fetch today's row
        if snapshot is None:
            result = await self.db.execute(
                select(ProjectSnapshot).where(
                    ProjectSnapshot.project_id == project_id,
                    ProjectSnapshot.snapshot_date == today,
                )
            )
            snapshot = result.scalar_one()
        return snapshot

    async def get_latest_snapshot(self, project_id: UUID):
        stmt = (
            select(ProjectSnapshot)
            .where(ProjectSnapshot.project_id == project_id)
            .order_by(ProjectSnapshot.snapshot_date.desc())
            .limit(1)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_latest_snapshot_before(self, project_id: UUID, before: date):
        stmt = (
            select(ProjectSnapshot)
            .where(
                ProjectSnapshot.project_id == project_id,
                ProjectSnapshot.snapshot_date < before,
            )
            .order_by(ProjectSnapshot.snapshot_date.desc())
            .limit(1)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def count_unassigned_tasks(self, project_id: UUID) -> int:
        from app.modules.tasks.model import Task
        from app.modules.assigned_members.model import AssignedMember

        stmt = (
            select(func.count(Task.id))
            .select_from(Task)
            .outerjoin(AssignedMember, Task.id == AssignedMember.task_id)
            .where(Task.project_id == project_id)
            .where(AssignedMember.id.is_(None))
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()