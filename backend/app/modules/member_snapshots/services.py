from sqlalchemy.ext.asyncio import AsyncSession
from statistics import median
import logging 

from app.modules.project_snapshots.schema import (
    ProjectSnapshotUpsert,
)
from .model import MemberSnapshot, MemberStatus
from .repo import MemberSnapshotRepo
from uuid import UUID
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from .schema import MemberSnapshotUpsert
from app.modules.tasks.enums import Status

logger = logging.getLogger(__name__)

def round_half_up_int(value):
    return int(Decimal(str(value)).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


class MemberSnapshotService:
    @staticmethod
    async def get_one_member_snapshot(db: AsyncSession, member_snapshot_id):
        repo = MemberSnapshotRepo(db)
        return await repo.get_by_id(member_snapshot_id)

    @staticmethod
    async def get_all_member_snapshots(db: AsyncSession):
        repo = MemberSnapshotRepo(db)
        return await repo.get_all()

    @staticmethod
    async def upsert_today_member_snapshot(
        db: AsyncSession, member_id: UUID, snapshot: MemberSnapshotUpsert
    ):
        repo = MemberSnapshotRepo(db)
        return await repo.upsert_today_member_snapshot(member_id, snapshot)

    @staticmethod
    async def get_latest_snapshot(db: AsyncSession, member_id: UUID):
        repo = MemberSnapshotRepo(db)
        return await repo.get_latest_member_snapshot(member_id)

    @staticmethod
    async def delete_member_snapshot(db: AsyncSession, db_item: MemberSnapshot):
        repo = MemberSnapshotRepo(db)
        return await repo.delete(db_item)

    @staticmethod
    async def check_workload_status(
        db: AsyncSession, member_id: UUID, member_workload_points: Decimal
    ):
        from app.modules.project_members.services import ProjectMemberService
        from app.modules.projects.services import ProjectService

        repo = MemberSnapshotRepo(db)

        member_snapshot = await repo.get_latest_member_snapshot(member_id)
        member = await ProjectMemberService.get_one_member(db, member_id)

        if member is None:
            return None

        project = await ProjectService.get_project_with_latest_snapshot(
            db, member.project_id
        )

        if project is None:
            return None

        # total number of project members
        project_members = (
            await ProjectMemberService.get_members_by_project_with_member_snapshot(
                db, project.id
            )
        )

        if project_members is None:
            return None

        member_points = [
            member.snapshot.total_effective_points
            for member in project_members
            if member.snapshot is not None
        ]

        capacity_multiplier = (
            member_snapshot.capacity_multiplier if member_snapshot is not None else 1.0
        )

        # normalize baseline for every member
        normal_baseline = median(member_points)
        member_baseline = normal_baseline * Decimal(str(capacity_multiplier))
        lower_baseline = member_baseline / Decimal(str(2.00))

        # Conditional for the workload status of the member
        status = MemberStatus.NORMAL
        if member_workload_points > member_baseline:
            status = MemberStatus.OVERLOADED
        elif member_workload_points < lower_baseline:
            status = MemberStatus.UNDERUTILIZED

        return status

    @staticmethod
    async def calculate_member_workload(db: AsyncSession, member_id: UUID):
        """
        Calculate workload for a single member and update their snapshot.
        Maintains the same interface as before but uses the centralized calculation logic.
        """
        from app.modules.assigned_members.services import AssignedMemberService
        from app.modules.tasks.services import TaskService
        from app.modules.projects.services import ProjectService
        from app.modules.project_members.services import ProjectMemberService
        from app.modules.redistribution_recommendations.workload_calculation import (
            calculate_member_workload_totals,
            validate_task_deadline
        )
        from app.modules.project_snapshots.services import ProjectSnapshotService

        # Get member's project and assigned tasks
        assigned_members = await AssignedMemberService.get_members(db, member_id)
        task_ids = [member.task_id for member in assigned_members if member.task_id is not None]
        all_tasks = await TaskService.batch_get_task(db, task_ids)

        # Get the project (assuming member belongs to one project)
        project = None
        member_project = await ProjectMemberService.get_one_member(db, member_id)
        if member_project:
            project = await ProjectService.get_one_project(db, member_project.project_id)

        if project is None:
            return None

        project_id = project.id
        base_days_per_point = project.base_days_per_point if project else 1
        #check

        # Validate deadlines for all tasks (preserving existing validation logic)
        for task in all_tasks:
            is_valid, msg = await validate_task_deadline(task, base_days_per_point)
            if not is_valid:
                # Log validation error but continue processing (preserving existing behavior)
                logger.warning(f"Task deadline validation failed for task {task.id}: {msg}")

        # Calculate workload totals for this member using our new centralized logic
        total_points, total_effective_points = await calculate_member_workload_totals(db, member_id)

        # Convert to Decimal for consistency with existing code
        total_effective_points_decimal = Decimal(str(total_effective_points)).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        total_points_decimal = Decimal(str(total_points)).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )

        # Get project total workload (existing logic)
        project = await ProjectService.get_project_with_latest_snapshot(db, project_id)

        member_snapshot = await MemberSnapshotService.get_latest_snapshot(db, member_id)

        previous_member_points = (
            member_snapshot.total_effective_points
            if member_snapshot is not None
            else Decimal("0")
        )

        # Calculate change in this member's workload
        difference = total_effective_points_decimal - previous_member_points

        # Guard: project may not have a snapshot yet (first run for this project)
        previous_project_total = (
            project.snapshot.total_workload_points
            if project.snapshot is not None
            else Decimal("0")
        )
        project_workload_points = previous_project_total + difference
        project_workload_points = round_half_up_int(project_workload_points)

        # Update total_workload of project
        project_snapshot = await ProjectSnapshotService.upsert_today_snapshot(
            db,
            project_id,
            ProjectSnapshotUpsert(total_workload_points=project_workload_points),
        )

        if project_snapshot is None:
            return None

        # Check workload status (existing logic)
        status = await MemberSnapshotService.check_workload_status(
            db, member_id, total_effective_points_decimal
        )

        # Update the member_snapshot
        member_snapshot = await MemberSnapshotService.upsert_today_member_snapshot(
            db,
            member_id,
            MemberSnapshotUpsert(
                total_effective_points=total_effective_points_decimal,
                workload_status=status,
            ),
        )

        return member_snapshot
