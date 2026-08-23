from sqlalchemy.ext.asyncio import AsyncSession
from .model import MemberSnapshot
from .repo import MemberSnapshotRepo
from uuid import UUID
from datetime import date

from .schema import MemberSnapshotUpsert
from app.modules.assigned_members.services import AssignedMemberService
from app.modules.tasks.services import TaskService
from app.modules.tasks.enums import Status


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
    async def calculate_member_workload(db: AsyncSession, member_id: UUID):
        # get all tasks of the member
        assigned_members = await AssignedMemberService.get_members(db, member_id)
        task_ids = [member.task_id for member in assigned_members]
        all_tasks = await TaskService.batch_get_task(db, task_ids)

        # filter tasks to only in-progress and not-started
        filtered_task = [
            task
            for task in all_tasks
            if task.status in (Status.IN_PROGRESS, Status.NOT_STARTED)
        ]

        # calculate the task effective_points
        total_effective_points = 0
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

            if task.complexity_points is None:
                task.complexity_points = 0

            total_effective_points += task.complexity_points * urgency_multiplier

            #calculate project workload

