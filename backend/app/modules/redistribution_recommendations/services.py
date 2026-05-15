from sqlalchemy.ext.asyncio import AsyncSession
from .model import RedistributionRecommendation
from .repo import RedisRecomRepo
from .schema import (
    RedisRecomCreate,
    RedisRecomUpdate,
)


class RecommendationService:
    @staticmethod
    async def get_one_recommendation(db: AsyncSession, project_id):
        repo = RedisRecomRepo(db)
        return await repo.get_by_id(project_id)

    @staticmethod
    async def get_all_recommendations(db: AsyncSession):
        repo = RedisRecomRepo(db)
        return await repo.get_all()

    @staticmethod
    async def create_recommendation(db: AsyncSession, project: RedisRecomCreate):
        repo = RedisRecomRepo(db)
        return await repo.create(project)

    @staticmethod
    async def update_recommendation(
        db: AsyncSession, db_item: RedisRecomUpdate, project: RedisRecomUpdate
    ):
        repo = RedisRecomRepo(db)
        return await repo.update(db_item, project)

    @staticmethod
    async def delete_recommendation(db: AsyncSession, db_item: RedistributionRecommendation):
        repo = RedisRecomRepo(db)
        return await repo.delete(db_item)
