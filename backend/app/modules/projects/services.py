from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.projects.model import Project, ProjectMember
from app.modules.projects.repo import ProjectRepo, ProjectMemberRepo
from app.modules.projects.schema import (
    ProjectCreate,
    ProjectUpdate,
    ProjectMemberCreate,
    ProjectMemberUpdate,
)


class ProjectService:
    @staticmethod
    async def get_one_project(db: AsyncSession, project_id):
        repo = ProjectRepo(db)
        return await repo.get_by_id(project_id)

    @staticmethod
    async def get_all_projects(db: AsyncSession):
        repo = ProjectRepo(db)
        return await repo.get_all()

    @staticmethod
    async def create_project(db: AsyncSession, project: ProjectCreate):
        repo = ProjectRepo(db)
        return await repo.create(project)

    @staticmethod
    async def update_project(
        db: AsyncSession, db_item: ProjectUpdate, project: ProjectUpdate
    ):
        repo = ProjectRepo(db)
        return await repo.update(db_item, project)

    @staticmethod
    async def delete_project(db: AsyncSession, db_item: Project):
        repo = ProjectRepo(db)
        return await repo.delete(db_item)


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
    async def add_member(db: AsyncSession, project_member: ProjectMemberCreate):
        repo = ProjectMemberRepo(db)
        return await repo.create(project_member)

    @staticmethod
    async def update_member(
        db: AsyncSession,
        db_item: ProjectMemberUpdate,
        project_member: ProjectMemberUpdate,
    ):
        repo = ProjectMemberRepo(db)
        return await repo.update(db_item, project_member)

    @staticmethod
    async def delete_member(db: AsyncSession, db_item: ProjectMember):
        repo = ProjectMemberRepo(db)
        return await repo.delete(db_item)
