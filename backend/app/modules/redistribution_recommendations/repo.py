from typing import List
from uuid import UUID

from sqlalchemy import delete, select

from app.core.base_repo import BaseRepo
from .model import RedistributionRecommendation
from .schema import RedisRecomCreate


class RedisRecomRepo(BaseRepo):
    def __init__(self, db):
        super().__init__(db, RedistributionRecommendation)
        # Own reference so these methods do not depend on BaseRepo's attribute names
        self._session = db

    async def get_by_project(self, project_id: UUID) -> List[RedistributionRecommendation]:
        """All saved recommendations for a project, best (lowest rank) first."""
        result = await self._session.execute(
            select(RedistributionRecommendation)
            .where(RedistributionRecommendation.project_id == project_id)
            .order_by(RedistributionRecommendation.rank)
        )
        return list(result.scalars().all())

    async def replace_for_project(
        self, project_id: UUID, items: List[RedisRecomCreate]
    ) -> List[RedistributionRecommendation]:
        """
        Delete the project's existing recommendations and insert the new ones.
        Only flushes: the commit/rollback is handled by your session config, so
        either everything is swapped or nothing changes.
        """
        rows = [RedistributionRecommendation(**item.model_dump()) for item in items]
        await self._session.execute(
            delete(RedistributionRecommendation).where(
                RedistributionRecommendation.project_id == project_id
            )
        )
        self._session.add_all(rows)
        await self._session.flush()
        for row in rows:
            await self._session.refresh(row)
        return rows