"""
project_snapshot_service.py  -> replaces app/modules/project_snapshots/services.py

ONE orchestrator. Delete recalculate_project_workload.py, recompute_workload_state,
create_or_update_member_snapshots and calculate_member_workload_state.

Import rule that prevents the circular import: this module imports ONLY the pure
workload_math module at the top. Anything that might import project_snapshots
(task/assigned-member services) is imported lazily inside the function.

Lines marked  # ASSUMPTION  depend on your schema; adjust the names.
"""
from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.member_snapshots.schema import MemberSnapshotUpsert
from app.modules.member_snapshots.services import MemberSnapshotService
from app.modules.project_members.model import ProjectRole
from app.modules.project_members.services import ProjectMemberService
from app.modules.project_snapshots.repo import ProjectSnapshotRepo
from app.modules.project_snapshots.schema import ProjectSnapshotUpsert
from app.modules.redistribution_recommendations import workload_math as wm

APP_TZ = ZoneInfo("Asia/Manila")  # move to app/core/clock.py and import from there


def app_today() -> date:
    return datetime.now(APP_TZ).date()


COUNTED_ROLES = (ProjectRole.LEADER, ProjectRole.MEMBER)


def is_counted_member(member) -> bool:
    role = getattr(member, "project_role", None)  # same attribute the old code used
    return role is None or role in COUNTED_ROLES   # None means MEMBER


async def _lock_project(db: AsyncSession, project_id: UUID) -> None:
    """Serialise recalculations per project so two edits can't overwrite each other."""
    from app.modules.projects.model import Project  # lazy
    await db.execute(select(Project.id).where(Project.id == project_id).with_for_update())


async def _load_task_inputs(db: AsyncSession, member_id: UUID) -> list[wm.TaskInput]:
    """Read one member's tasks and convert to pure TaskInput objects."""
    from app.modules.assigned_members.services import AssignedMemberService  # lazy
    from app.modules.tasks.enums import Status as TaskStatus                 # lazy
    from app.modules.tasks.services import TaskService                       # lazy

    assigned = await AssignedMemberService.get_members(db, member_id)
    by_task = {am.task_id: am for am in assigned if am.task_id is not None}
    if not by_task:
        return []

    tasks = await TaskService.batch_get_task(db, list(by_task))
    inputs: list[wm.TaskInput] = []
    for t in tasks:
        if getattr(t, "deleted_at", None) is not None:   # ASSUMPTION: soft delete column
            continue
        if t.status is None or t.status == TaskStatus.NOT_STARTED:
            state = wm.TaskState.NOT_STARTED             # no status = not started (old behaviour)
        elif t.status == TaskStatus.IN_PROGRESS:
            state = wm.TaskState.IN_PROGRESS
        else:
            state = wm.TaskState.INACTIVE                # whitelist: only the two above count
        am = by_task[t.id]
        inputs.append(wm.TaskInput(
            state=state,
            complexity_points=wm.complexity_to_points(t.complexity),
            deadline=t.deadline,
            effort_share=getattr(am, "effort_share", None),        # ASSUMPTION
            is_parent=bool(getattr(t, "has_subtasks", False)),     # ASSUMPTION
        ))
    return inputs


class ProjectSnapshotService:
    @staticmethod
    async def get_current_snapshot(db: AsyncSession, project_snapshot_id):
        return await ProjectSnapshotRepo(db).get_by_id(project_snapshot_id)

    @staticmethod
    async def get_latest_snapshot(db: AsyncSession, project_snapshot_id):
        return await ProjectSnapshotRepo(db).get_latest_snapshot(project_snapshot_id)

    @staticmethod
    async def upsert_today_snapshot(
        db: AsyncSession, project_id: UUID | None, snapshot: ProjectSnapshotUpsert
    ):
        if project_id is None:
            return None
        return await ProjectSnapshotRepo(db).upsert_today_snapshot(project_id, snapshot)

    @staticmethod
    async def calculate_project_workload(
        db: AsyncSession,
        project_id: UUID,
        *,
        today: date | None = None,
        config: wm.WorkloadConfig | None = None,
        commit: bool = True,
    ) -> wm.ProjectWorkload:
        """
        Recompute and persist workload for the whole project. Safe to call from any
        trigger (task change, assignment change, settings change, daily job).
        Pass commit=False when the caller owns the transaction.
        """
        from app.modules.member_snapshots.model import MemberStatus  # lazy

        today = today or app_today()
        cfg = config or wm.WorkloadConfig()

        await _lock_project(db, project_id)
        members = await ProjectMemberService.get_all_members_by_project(db, project_id)

        # 1. Fresh inputs for EVERY member (idle members are 0 and stay in the median)
        inputs: list[wm.MemberInput] = []
        for pm in members:
            tasks = await _load_task_inputs(db, pm.id)
            raw, eff = wm.member_totals(tasks, today)
            inputs.append(wm.MemberInput(
                member_id=pm.id,
                total_points=raw,
                total_effective_points=eff,
                # ASSUMPTION: ProjectMember is the single source of truth for both settings
                capacity_multiplier=getattr(pm, "capacity_multiplier", None),
                silence_warning=bool(getattr(pm, "silence_warning", False)),
                is_counted=is_counted_member(pm),
            ))

        # 2. Pure pass: median, expected_load, status
        result = wm.compute_project_workload(inputs, cfg)

        # 3. Persist EVERY member (non-counted get NORMAL, so no stale OVERLOADED rows)
        for r in result.members:
            fields = dict(
                total_points=r.total_points,                  # ASSUMPTION: new columns (see guide step 4)
                total_effective_points=r.total_effective_points,
                expected_load=r.expected_load,
                workload_status=MemberStatus[r.status.name],  # true status, even when silenced
                is_over_threshold=r.is_over_threshold,
            )
            if not r.is_over_threshold:
                fields["consecutive_fallback_count"] = 0      # spec 8.1 reset rule
            await MemberSnapshotService.upsert_today_member_snapshot(
                db, r.member_id, MemberSnapshotUpsert(**fields)
            )

        # 4. Project total from scratch, rounded once. Written even when nobody is counted,
        #    so an empty project shows 0 instead of a stale number.
        await ProjectSnapshotService.upsert_today_snapshot(
            db, project_id,
            ProjectSnapshotUpsert(total_workload_points=wm.round_half_up_int(result.total_effective_points)),
        )

        # 5. TODO: progress %, expected progress and variance

        if commit:
            await db.commit()
        return result

    @staticmethod
    async def sync_unassigned_tasks(db: AsyncSession, project_id: UUID, *, commit: bool = True):
        repo = ProjectSnapshotRepo(db)
        count = await repo.count_unassigned_tasks(project_id)
        # Only unassigned_tasks is set; the repo must apply exclude_unset (guide step 5)
        snap = await repo.upsert_today_snapshot(project_id, ProjectSnapshotUpsert(unassigned_tasks=count))
        if commit:
            await db.commit()
        return snap