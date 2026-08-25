from sqlalchemy.ext.asyncio import AsyncSession
from statistics import median

from app.modules.project_members.services import ProjectMemberService
from app.modules.project_snapshots.schema import (
    ProjectSnapshotUpsert,
)
from app.modules.project_snapshots.services import ProjectSnapshotService
from app.modules.projects.services import ProjectService
from .model import MemberSnapshot, MemberStatus
from .repo import MemberSnapshotRepo
from uuid import UUID
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from .schema import MemberSnapshotUpsert
from app.modules.assigned_members.services import AssignedMemberService
from app.modules.tasks.services import TaskService
from app.modules.tasks.enums import Status


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
        repo = MemberSnapshotRepo(db)

        member_snapshot = await repo.get_latest_member_snapshot(member_id)
        member = await ProjectMemberService.get_member_by_user_id(db, member_id)
        project = await ProjectService.get_project_with_latest_snapshot(
            db, member.project_id
        )

        # total number of project members
        project_members = (
            await ProjectMemberService.get_members_by_project_with_member_snapshot(
                db, project.id
            )
        )
        member_points = [
            member.snapshot.total_effective_points for member in project_members
        ]

        # normalize baseline for every member
        normal_baseline = median(member_points)
        member_baseline = normal_baseline * member_snapshot.capacity_multiplier
        lower_baseline = member_baseline / 2.00

        # Conditional for the workload status of the member
        status = MemberStatus.NORMAL
        if member_workload_points > member_baseline:
            status = MemberStatus.OVERLOADED
        elif member_workload_points < lower_baseline:
            status = MemberStatus.UNDERUTILIZED

        return status

    @staticmethod
    async def calculate_member_workload(db: AsyncSession, member_id: UUID):
        # get all row in the joint table of member and task
        assigned_members = await AssignedMemberService.get_members(db, member_id)
        task_ids = [member.task_id for member in assigned_members]
        all_tasks = await TaskService.batch_get_task(db, task_ids)
        project_id = all_tasks[0].project_id

        if all_tasks is None:
            all_tasks = []

        # filter tasks to only in-progress and not-started
        filtered_task = [
            task
            for task in all_tasks
            if task.status in (Status.IN_PROGRESS, Status.NOT_STARTED)
        ]

        # calculate the task effective_points
        total_points = 0
        for task in filtered_task:
            if task.status == Status.IN_PROGRESS:
                urgency_multiplier = 1.0
            else:  # Status.NOT_STARTED
                if task.deadline is None:
                    urgency_multiplier = 1.0  # no deadline -> 14-day bucket
                else:
                    days_left = (task.deadline - date.today()).days
                    if days_left <= 3 and days_left >= 0:
                        urgency_multiplier = 1.5
                    elif days_left <= 7 and days_left > 3:
                        urgency_multiplier = 1.25
                    elif days_left <= 14 and days_left > 7:
                        urgency_multiplier = 1.0
                    else:
                        urgency_multiplier = 0.75

            complexity_points = 0
            if task.complexity_points is None:
                complexity_points = 0
            else:
                complexity_points = task.complexity_points

            total_points += complexity_points * Decimal(str(urgency_multiplier))

        # turn float to decimal
        total_effective_points = Decimal(str(total_points)).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )

        # get project total workload
        project = await ProjectService.get_project_with_latest_snapshot(db, project_id)

        update_points = 0
        if project.snapshot is not None:
            update_points = (
                project.snapshot.total_workload_points + total_effective_points
            )
        update_points = round_half_up_int(update_points)
        # update total_workload of project return updated project workload
        project_snapshot = await ProjectSnapshotService.upsert_today_snapshot(
            db,
            project_id,
            ProjectSnapshotUpsert(total_workload_points=update_points),
        )

        if project_snapshot is None:
            return None

        # check workload status return workload status for member
        status = await MemberSnapshotService.check_workload_status(
            db, member_id, total_effective_points
        )

        # update the member_snapshot
        member_snapshot = await MemberSnapshotService.upsert_today_member_snapshot(
            db,
            member_id,
            MemberSnapshotUpsert(
                total_effective_points=total_effective_points,
                workload_status=status,
            ),
        )

        return member_snapshot
