from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.assigned_reviewer.model import AssignedReviewer
from app.modules.assigned_reviewer.repo import AssignedReviewerRepo
from .schema import AssignedReviewerCreate, AssignedReviewerResponse, AssignedReviewerUpdate
from uuid import UUID
from typing import Sequence, List
from app.modules.users.schema import UserResponse


class AssignedReviewerService:
    @staticmethod
    async def get_one_assigned_reviewer(db: AsyncSession, assigned_reviewer_id):
        repo = AssignedReviewerRepo(db)
        return await repo.get_by_id(assigned_reviewer_id)

    @staticmethod
    async def get_all_assigned_reviewers(db: AsyncSession):
        repo = AssignedReviewerRepo(db)
        return await repo.get_all()

    @staticmethod
    async def create_assigned_reviewer(
        db: AsyncSession, assigned_reviewer: AssignedReviewerCreate
    ):
        repo = AssignedReviewerRepo(db)
        return await repo.create(assigned_reviewer)

    @staticmethod
    async def update_assigned_reviewer(
        db: AsyncSession,
        db_item: AssignedReviewer,
        assigned_reviewer: AssignedReviewerUpdate,
    ):
        repo = AssignedReviewerRepo(db)
        return await repo.update(db_item, assigned_reviewer)

    @staticmethod
    async def delete_assigned_reviewer(db: AsyncSession, db_item: AssignedReviewer):
        repo = AssignedReviewerRepo(db)
        return await repo.delete(db_item)

    @staticmethod
    async def get_task_reviewers(db, task_id: UUID):
        repo = AssignedReviewerRepo(db)
        return await repo.get_task_reviewers(task_id)

    @staticmethod
    async def get_reviewers(
        db: AsyncSession, member_id: UUID
    ) -> List[AssignedReviewerResponse]:
        repo = AssignedReviewerRepo(db)
        return await repo.get_reviewers(member_id)

    @staticmethod
    async def get_reviewers_with_task(db: AsyncSession, member_ids: Sequence[UUID]):
        repo = AssignedReviewerRepo(db)
        return await repo.get_reviewers_with_task(member_ids)