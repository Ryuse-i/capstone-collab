from app.core.base_repo import BaseRepo
from .model import AssignedReviewer
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from uuid import UUID
from typing import Sequence
from app.modules.project_members.model import ProjectMember
from app.modules.tasks.model import Task


class AssignedReviewerRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, AssignedReviewer)

    # get all reviewers base on task id
    async def get_task_reviewers(self, task_id: UUID):
        # get task reviewers then get user information in the project member relationship
        stmt = (
            select(AssignedReviewer)
            .where(AssignedReviewer.task_id == task_id)
            .options(
                selectinload(AssignedReviewer.members).selectinload(ProjectMember.user)
            )
        )

        result = await self.db.execute(stmt)
        return result.scalars().all()

    # get all assigned rows base on member id
    async def get_reviewers(self, member_id: UUID):
        stmt = select(AssignedReviewer).where(AssignedReviewer.member_id == member_id)

        result = await self.db.execute(stmt)
        return result.scalars().all()

    # returns all assigned reviewers with task
    async def get_reviewers_with_task(self, member_ids: Sequence[UUID]):
        if not member_ids:
            return []

        stmt = (
            select(AssignedReviewer)
            .where(AssignedReviewer.member_id.in_(member_ids))
            .options(selectinload(AssignedReviewer.task))
        )

        results = await self.db.execute(stmt)
        return results.scalars().all()