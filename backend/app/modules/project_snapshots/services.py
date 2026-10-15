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
from app.modules.redistribution_recommendations.workload_math import urgency_multiplier

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



#loads all eligible task for the member 
async def _member_points(db: AsyncSession, member_id: UUID) -> Decimal:
    """Read one member's tasks and convert to pure TaskInput objects."""
    from app.modules.assigned_members.services import AssignedMemberService  # lazy
    from app.modules.tasks.services import TaskService                       # lazy


    #get all instances where the member is assigned
    #this would return all joint table rows for the assigned member
    assigned = await AssignedMemberService.get_members(db, member_id)
    #get all tasks ids 
    by_task = {am.task_id: am for am in assigned if am.task_id is not None}
    if not by_task:
        return Decimal("0")

    #get all task with not-started and in-progress. completed and submited is not included here
    tasks = await TaskService.get_eligible_tasks(db, list(by_task))

    total_effective_points = Decimal("0")
    for t in tasks:
        # Get all members assigned to this task to calculate equal share
        task_members = await AssignedMemberService.get_task_members(db, t.id)
        #how many member is assigned for this task 
        member_count = len(task_members)
        #splits the points of the task 
        #calculate the workload points of the task
        weighted_points = Decimal(t.complexity_points) * urgency_multiplier(t.deadline, app_today())
        #split the points for how many member is assigned for this task
        effective_points = weighted_points / member_count
        total_effective_points += effective_points


    return total_effective_points 


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
    ) -> wm.ProjectWorkload:
        """
        Recompute and persist workload for the whole project. Safe to call from any
        trigger (task change, assignment change, settings change, daily job).
        Pass commit=False when the caller owns the transaction.
        """
        from app.modules.member_snapshots.model import MemberStatus 
        from app.modules.member_snapshots.services import MemberSnapshotService

        today = today or app_today()

        #check if config provided
        cfg = config or wm.WorkloadConfig()

        await _lock_project(db, project_id)
        #get all members except for instructor and advisor 
        members = await ProjectMemberService.get_elligible_members(db, project_id)


        inputs: list[wm.MemberInput] = []
        for pm in members:
            #get total_effective_points of each member 
            member_points = await _member_points(db, pm.id)
            member_snapshot = await MemberSnapshotService.get_latest_snapshot(db, pm.id)

            #containes all the points of the members
            #do i still need the id of the member to be a key-value-pair
            inputs.append(wm.MemberInput(
                member_id = pm.id,
                total_effective_points = member_points,
                capacity_multiplier = member_snapshot.capacity_multiplier,
                silence_warning = member_snapshot.silence_warning
            ))

        # 2. Pure pass: median, expected_load, status
        result = wm.compute_project_workload(inputs, cfg)

        # 3. Persist EVERY member (non-counted get NORMAL, so no stale OVERLOADED rows)
        for r in result.members:
            fields = dict(
                total_effective_points=r.total_effective_points,
                expected_load=r.expected_load,
                workload_status=MemberStatus[r.status.name],  # true status, even when silenced
            )
            await MemberSnapshotService.upsert_today_member_snapshot(
                db, r.member_id, MemberSnapshotUpsert(**fields)
            )

        # 4. Project total from scratch, rounded once. Written even when nobody is counted,
        #    so an empty project shows 0 instead of a stale number.
        await ProjectSnapshotService.upsert_today_snapshot(
            db, project_id,
            ProjectSnapshotUpsert(total_workload_points=wm.round_half_up_int(result.total_effective_points)),
        )

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