from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.assigned_members.model import AssignedMember
from app.modules.assigned_members.repo import AssignedMemberRepo
from .schema import AssignedMemberCreate, AssignedMemberResponse, AssignedMemberUpdate
from uuid import UUID
from typing import Sequence
from app.modules.project_snapshots.services import ProjectSnapshotService


class AssignedMemberService:
    @staticmethod
    async def get_one_assigned_member(db: AsyncSession, assigned_member_id):
        repo = AssignedMemberRepo(db)
        return await repo.get_by_id(assigned_member_id)

    @staticmethod
    async def get_all_assigned_members(db: AsyncSession):
        repo = AssignedMemberRepo(db)
        return await repo.get_all()

    @staticmethod
    async def create_assigned_member(
        db: AsyncSession, assigned_member: AssignedMemberCreate
    ):
        from app.modules.tasks.repo import TaskRepo
        from app.modules.project_snapshots.services import ProjectSnapshotService
        repo = AssignedMemberRepo(db)
        task_repo = TaskRepo(db)

        member = await repo.create(assigned_member)
        
        # Fetch the task to get project_id
        task = await task_repo.get_by_id(member.task_id)
        project_id = task.project_id
        await ProjectSnapshotService.sync_unassigned_tasks(db, project_id)
        #calculate project workload
        project_workload = await ProjectSnapshotService.calculate_project_workload(db, project_id)

        return member

    @staticmethod
    async def update_assigned_member(
        db: AsyncSession,
        db_item: AssignedMemberUpdate,
        assigned_member: AssignedMemberUpdate,
    ):
        from app.modules.tasks.repo import TaskRepo
        task_repo = TaskRepo(db)
        repo = AssignedMemberRepo(db)
        #get project id 
        # Fetch the task to get project_id
        task = await task_repo.get_by_id(db_item.id)
        project_id = task.project_id
        #sync the unassigned tasks
        await ProjectSnapshotService.sync_unassigned_tasks(db, project_id)

        #Calculate the project workload 
        project_workload = await ProjectSnapshotService.calculate_project_workload(db, project_id)

        return await repo.update(db_item, assigned_member)

    @staticmethod
    async def delete_assigned_member(db: AsyncSession, db_item: AssignedMember):
        from app.modules.tasks.repo import TaskRepo
        from app.modules.project_snapshots.services import ProjectSnapshotService
        
        task_repo = TaskRepo(db)
        repo = AssignedMemberRepo(db)

        task_id = db_item.task_id
        result = await repo.delete(db_item)

        # Fetch the task to get project_id
        task = await task_repo.get_by_id(task_id)
        project_id = task.project_id
        #sync the unassigned tasks
        await ProjectSnapshotService.sync_unassigned_tasks(db, project_id)

        #Calculate the project workload 
        project_workload = await ProjectSnapshotService.calculate_project_workload(db, project_id)
        return result

    @staticmethod
    async def get_task_members(db, task_id: UUID):
        repo = AssignedMemberRepo(db)

        results = await repo.get_task_members(task_id)

        users = [result.members.user for result in results]
        return users

    @staticmethod
    async def batch_create_members(
        db: AsyncSession, members: list[AssignedMemberCreate]
    ):
        from app.modules.project_snapshots.services import ProjectSnapshotService
        from app.modules.tasks.repo import TaskRepo

        repo = AssignedMemberRepo(db)
        task_repo = TaskRepo(db)

        project_id = 0
        result = []
        for member in members:
            response = await repo.create(member)
            result.append(response.users)

            #get the project id from the task
            task = await task_repo.get_by_id(member.task_id)
            project_id = task.project_id

        #check the unassinged tasks
        await ProjectSnapshotService.sync_unassigned_tasks(db, project_id)
        #update the project_workload
        project_workload = await ProjectSnapshotService.calculate_project_workload(db, project_id)
        return result

    @staticmethod
    async def get_members(
        db: AsyncSession, member_id: UUID
    ) -> list[AssignedMemberResponse]:
        repo = AssignedMemberRepo(db)
        return await repo.get_members(member_id)

    @staticmethod
    async def get_members_with_task(db: AsyncSession, member_ids: Sequence[UUID]):
        repo = AssignedMemberRepo(db)

        return await repo.get_members_with_task(member_ids)
