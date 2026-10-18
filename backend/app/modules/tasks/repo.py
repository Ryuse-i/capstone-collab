from sqlalchemy import select
from sqlalchemy.orm import selectinload
from uuid import UUID
from app.core.base_repo import BaseRepo
from app.modules.assigned_members.model import AssignedMember
from app.modules.tasks.model import Task
from typing import Sequence
from app.modules.project_members.model import ProjectMember

from app.modules.tasks.schema import TaskResponse
from app.modules.tasks.model import Status
from app.modules.assigned_reviewer.model import AssignedReviewer




class TaskRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, Task)

    async def get_assigned_member(self, task_id: UUID):
        stmt = (
            select(Task)
            .where(Task.id == task_id)
            .options(selectinload(Task.assigned_members))
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def get_assigned_members(self, project_id: UUID):
        stmt = (
            select(Task)
            .where(Task.project_id == project_id)
            .options(
                selectinload(Task.assigned_members)
                .selectinload(AssignedMember.members)
                .selectinload(ProjectMember.user)
            )
            # make the project member load with the user relationship
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_all_project_tasks(self, project_id):
        stmt = select(Task).where(Task.project_id == project_id)

        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_tasks_for_user(self, user_id: UUID):
        stmt = (
            select(Task)
            .join(AssignedMember, Task.id == AssignedMember.task_id)
            .join(ProjectMember, AssignedMember.member_id == ProjectMember.id)
            .where(ProjectMember.user_id == user_id)
            .options(
                selectinload(Task.assigned_members)
                .selectinload(AssignedMember.members)
                .selectinload(ProjectMember.user)
            )
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def batch_get_task(self, ids: Sequence[UUID]) -> list[TaskResponse]:
        if not ids:
            return []

        stmt = select(Task).where(Task.id.in_(ids))
        results = await self.db.execute(stmt)
        return results.scalars().all()

    async def get_eligible_tasks(self, ids: Sequence[UUID]) -> list[TaskResponse]:
        if not ids: 
            return []

        stmt = (
            select(Task)
            .where(Task.id.in_(ids))
            .where(
                Task.status.in_([
                    Status.NOT_STARTED,
                    Status.IN_PROGRESS,
                ])
            )
        )
        results = await self.db.execute(stmt)
        return results.scalars().all()

    async def get_tasks_by_reviewer(self, user_id: UUID, project_id: UUID) -> Sequence[Task]:
        """Submitted tasks where the user is an assigned reviewer (via any membership)."""
        stmt = (
            select(Task)
            .join(AssignedReviewer, AssignedReviewer.task_id == Task.id)
            .join(ProjectMember, ProjectMember.id == AssignedReviewer.member_id)
            .where(
                ProjectMember.user_id == user_id,
                Task.status == Status.SUBMITTED,
                Task.project_id == project_id,
            )
            .options(
                selectinload(Task.assigned_members)
                .selectinload(AssignedMember.members)
                .selectinload(ProjectMember.user),
            )
        )
        result = await self.db.execute(stmt)
        return result.scalars().unique().all()