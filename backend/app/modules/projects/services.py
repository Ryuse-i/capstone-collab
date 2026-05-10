from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.projects.model import Project
from app.modules.projects.repo import ProjectRepo
from app.modules.projects.schema import ProjectCreate, ProjectUpdate


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

    @staticmethod
    async def add_project_member(db, project_member):
        return
