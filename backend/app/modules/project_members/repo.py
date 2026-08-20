from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.base_repo import BaseRepo

from .model import ProjectMember


class ProjectMemberRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, ProjectMember)

    async def get_by_user_id(self, user_id: UUID):
        query = (
            select(ProjectMember)
            .options(
                selectinload(ProjectMember.project), selectinload(ProjectMember.user)
            )
            .where(ProjectMember.user_id == user_id)
        )
        result = await self.db.execute(query)
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
