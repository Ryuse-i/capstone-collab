from .model import ProjectMember
from sqlalchemy.ext.asyncio import AsyncSession
from .schema import ProjectMemberCreate, ProjectMemberUpdate
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
