from .model import ProjectMember
from sqlalchemy.ext.asyncio import AsyncSession
from .schema import (
    ProjectMemberCreate,
    ProjectMemberUpdate,
)
from .repo import ProjectMemberRepo


class ProjectMemberService:
    @staticmethod
    async def get_one_member(db: AsyncSession, project_member_id):
        repo = ProjectMemberRepo(db)
        return await repo.get_by_id(project_member_id)

    @staticmethod
    async def get_all_members(db: AsyncSession):
        repo = ProjectMemberRepo(db)
        return await repo.get_all()

    @staticmethod
    async def get_all_members_by_project(db, project_id):
        return ProjectMemberRepo.get_all_members_by_project(db, project_id)

    @staticmethod
    async def get_all_projects_by_member(db, member_id):
        return ProjectMemberRepo.get_all_project_by_member(db, member_id)

    @staticmethod
    async def add_member(db: AsyncSession, project_member: ProjectMemberCreate):
        repo = ProjectMemberRepo(db)
        member = await repo.create(project_member)
        await db.commit()
        return member

    @staticmethod
    async def update_member(
        db: AsyncSession,
        db_item: ProjectMemberUpdate,
        project_member: ProjectMemberUpdate,
    ):
        repo = ProjectMemberRepo(db)
        member = await repo.update(db_item, project_member)
        await db.commit()
        return member

    @staticmethod
    async def delete_member(db: AsyncSession, db_item: ProjectMember):
        repo = ProjectMemberRepo(db)
        await repo.delete(db_item)
        await db.commit()
        return None
