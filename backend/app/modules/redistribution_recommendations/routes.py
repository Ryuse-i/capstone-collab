from uuid import UUID
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_async_session
from .schema import (
    RedisRecomCreate,
    RedisRecomResponse,
    RedisRecomUpdate,
)
from .services import RecommendationService

recommendation_route = APIRouter()


@recommendation_route.get("/", response_model=List[RedisRecomResponse])
async def get_all_recommendations(db: AsyncSession = Depends(get_async_session)):
    return await RecommendationService.get_all_recommendations(db)


# --- Engine endpoints (declared before the /{recommendation_id} routes) --- #
@recommendation_route.post(
    "/project/{project_id}/generate", response_model=List[RedisRecomResponse]
)
async def generate_recommendations(
    project_id: UUID, db: AsyncSession = Depends(get_async_session)
):
    """Recompute and save ranked options for the project's most overloaded member.
    Replaces the project's previous recommendations. Empty list = nothing to recommend."""
    return await RecommendationService.generate_and_save_recommendations(db, project_id)


@recommendation_route.get(
    "/project/{project_id}", response_model=List[RedisRecomResponse]
)
async def get_project_recommendations(
    project_id: UUID, db: AsyncSession = Depends(get_async_session)
):
    """Saved recommendations for one project, best rank first."""
    return await RecommendationService.get_project_recommendations(db, project_id)


# --- CRUD by recommendation id --- #
@recommendation_route.get("/{recommendation_id}", response_model=RedisRecomResponse)
async def get_one_recommendation(
    recommendation_id: int, db: AsyncSession = Depends(get_async_session)
):
    db_item = await RecommendationService.get_one_recommendation(db, recommendation_id)
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Recommendation not found"
        )
    return db_item


@recommendation_route.post(
    "/", response_model=RedisRecomResponse, status_code=status.HTTP_201_CREATED
)
async def create_recommendation(
    recommendation: RedisRecomCreate, db: AsyncSession = Depends(get_async_session)
):
    return await RecommendationService.create_recommendation(db, recommendation)


@recommendation_route.patch("/{recommendation_id}", response_model=RedisRecomResponse)
async def update_recommendation(
    recommendation_id: int,
    recommendation: RedisRecomUpdate,
    db: AsyncSession = Depends(get_async_session),
):
    db_item = await RecommendationService.get_one_recommendation(db, recommendation_id)
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Recommendation not found"
        )
    return await RecommendationService.update_recommendation(
        db, db_item, recommendation
    )


@recommendation_route.delete(
    "/{recommendation_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def delete_recommendation(
    recommendation_id: int,
    db: AsyncSession = Depends(get_async_session),
):
    db_item = await RecommendationService.get_one_recommendation(db, recommendation_id)
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Recommendation not found"
        )
    await RecommendationService.delete_recommendation(db, db_item)
    return None