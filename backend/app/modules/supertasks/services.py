from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.supertasks.model import Supertask
from app.modules.supertasks.repo import SupertaskRepo
from app.modules.supertasks.schema import SupertaskCreate, SupertaskUpdate


class SupertaskService:
    @staticmethod
    async def get_one_supertask(db: AsyncSession, supertask_id: UUID):
        """Fetch a single supertask by id, or None if it doesn't exist."""
        repo = SupertaskRepo(db)
        return await repo.get_by_id(supertask_id)

    @staticmethod
    async def get_project_supertasks(db: AsyncSession, project_id: UUID):
        """Fetch every supertask belonging to a project."""
        repo = SupertaskRepo(db)
        return await repo.get_by_project(project_id)

    @staticmethod
    async def create_supertask(
        db: AsyncSession, data: SupertaskCreate, created_by: UUID
    ):
        """Create a supertask; created_by comes from the authenticated user."""
        repo = SupertaskRepo(db)
        return await repo.create_for_user(data, created_by)

    @staticmethod
    async def update_supertask(
        db: AsyncSession, db_item: Supertask, data: SupertaskUpdate
    ):
        """Partially update a supertask."""
        repo = SupertaskRepo(db)
        return await repo.update_fields(db_item, data)

    @staticmethod
    async def delete_supertask(db: AsyncSession, db_item: Supertask):
        """
        Delete a supertask. Its tasks are kept and detached
        (tasks.supertask_id is set to NULL by the database).
        """
        repo = SupertaskRepo(db)
        return await repo.delete(db_item)