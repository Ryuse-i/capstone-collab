from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.base_repo import BaseRepo
from app.modules.supertasks.model import Supertask
from app.modules.supertasks.schema import SupertaskCreate, SupertaskUpdate


class SupertaskRepo(BaseRepo):
    def __init__(self, db: AsyncSession):
        super().__init__(db, Supertask)
        # Kept locally so the methods below don't depend on BaseRepo internals.
        self._db = db

    async def get_by_project(self, project_id: UUID) -> list[Supertask]:
        """Return all supertasks of one project, oldest first."""
        result = await self._db.execute(
            select(Supertask)
            .where(Supertask.project_id == project_id)
            .order_by(Supertask.created_at)
        )
        return list(result.scalars().all())

    async def create_for_user(
        self, data: SupertaskCreate, created_by: UUID
    ) -> Supertask:
        """Create a supertask owned by the given user."""
        item = Supertask(**data.model_dump(), created_by=created_by)
        self._db.add(item)
        await self._db.commit()
        await self._db.refresh(item)
        return item

    async def update_fields(
        self, item: Supertask, data: SupertaskUpdate
    ) -> Supertask:
        """
        Apply a partial update. exclude_unset=True means fields the client
        did not send are left untouched instead of being overwritten with None.
        """
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(item, field, value)
        await self._db.commit()
        await self._db.refresh(item)
        return item