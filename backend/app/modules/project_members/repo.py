from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.orm import selectinload, contains_eager

from app.core.base_repo import BaseRepo
from app.modules.project_members.schema import ProjectMemberWithSnapshot
from app.modules.member_snapshots.model import MemberSnapshot

from .model import ProjectMember


class ProjectMemberRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, ProjectMember)

    async def get_current_member(self, member_id: UUID):
        stmt = select(ProjectMember).where(ProjectMember.user_id == member_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_user_id(self, user_id: UUID):
        stmt = (
            select(ProjectMember)
            .options(
                selectinload(ProjectMember.project), selectinload(ProjectMember.user)
            )
            .where(ProjectMember.user_id == user_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_user_and_project(self, user_id: UUID, project_id: UUID):
        query = select(ProjectMember).where(
            ProjectMember.user_id == user_id,
            ProjectMember.project_id == project_id,
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_all_members_by_project(self, project_id: UUID):
        query = (
            select(ProjectMember)
            .options(selectinload(ProjectMember.user))
            .where(ProjectMember.project_id == project_id)
        )
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_all_projects_by_member(self, member_id: UUID):
        query = (
            select(ProjectMember)
            .options(
                selectinload(ProjectMember.project), selectinload(ProjectMember.user)
            )
            .where(ProjectMember.user_id == member_id)
        )
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_members_by_project_with_member_snapshot(
        self, project_id: UUID
    ) -> list[ProjectMemberWithSnapshot]:
        stmt = (
            select(ProjectMember)
            .where(ProjectMember.project_id == project_id)
            .options(selectinload(ProjectMember.snapshots))
        )

        results = await self.db.execute(stmt)
        return results.scalars().all()

    async def get_members_with_user_and_snapshot(self, project_id: UUID):
        # chain for the latest member_snapshot
        latest_date_subq = (
            select(func.max(MemberSnapshot.snapshot_date))
            .where(MemberSnapshot.member_id == ProjectMember.id)
            .correlate(ProjectMember)
            .scalar_subquery()
        )

        # get all members of the project and load with user and snapshot information
        stmt = (
            select(ProjectMember)
            .outerjoin(
                MemberSnapshot,
                (MemberSnapshot.member_id == ProjectMember.id)
                & (MemberSnapshot.snapshot_date == latest_date_subq),
            )
            .where(ProjectMember.project_id == project_id)
            .options(
                contains_eager(ProjectMember.snapshots),
                selectinload(ProjectMember.user),
            )
        )
        result = await self.db.execute(stmt.execution_options(populate_existing=True))
        return result.unique().scalars().all()

    async def get_by_id_with_project(self, item_id):
        query = (
            select(self.model)
            .options(selectinload(self.model.project))
            .where(self.model.id == item_id)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
