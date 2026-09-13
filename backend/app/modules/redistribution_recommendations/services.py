from typing import List, Dict, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from .model import RedistributionRecommendation
from .repo import RedisRecomRepo
from .schema import (
    RedisRecomCreate,
    RedisRecomUpdate,
)
from app.modules.redistribution_recommendations.redistribution_logic import generate_redistribution_options


class RecommendationService:
    """Unified service for redistribution recommendations."""
    
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
        
    @staticmethod
    async def generate_redistribution_options(
        db: AsyncSession,
        project_id: UUID
    ) -> List[Dict[str, Any]]:
        """
        Generate ranked redistribution options for a project.

        This is the main entry point for the redistribution recommendations feature.
        It identifies the most overloaded member and generates options to relieve their overload
        through task redistribution, sharing, splitting, or deadline extension.

        Args:
            db: Database session
            project_id: ID of the project to analyze

        Returns:
            List of redistribution options ranked by impact (highest first),
            with Move Deadline options at the end as fallback options.
        """
        return await generate_redistribution_options(db, project_id)
