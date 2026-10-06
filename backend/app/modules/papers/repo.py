from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.base_repo import BaseRepo
from app.modules.papers.model import Paper


def _apply_filters(stmt, year: int | None, author: str | None, category: str | None):
    if year is not None:
        stmt = stmt.where(func.extract("year", Paper.published_date) == year)
    if author:
        stmt = stmt.where(Paper.authors.any(author))  # exact match on one name
    if category:
        stmt = stmt.where(Paper.category == category)
    return stmt


class PaperRepo(BaseRepo):
    def __init__(self, db: AsyncSession):
        super().__init__(db, Paper)

    async def get_by_id(self, paper_id: int):
        """Get a paper by its integer ID."""
        return await super().get_by_id(paper_id)

    async def list_papers(
        self,
        limit: int = 50,
        offset: int = 0,
        year: int | None = None,
        author: str | None = None,
        keyword: str | None = None,
        category: str | None = None,
    ) -> list[Paper]:
        """List papers with optional filters and pagination."""
        stmt = _apply_filters(select(Paper), year, author, category)
        if keyword:
            stmt = stmt.where(Paper.keywords.any(keyword))
        stmt = stmt.order_by(Paper.created_at.desc()).offset(offset).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def search_by_embedding(
        self,
        query_vector: list[float],
        limit: int = 5,
        min_score: float = 0.0,
        year: int | None = None,
        author: str | None = None,
        category: str | None = None,
    ) -> list[tuple[Paper, float]]:
        """Nearest papers by cosine distance. Returns (paper, similarity)."""
        distance = Paper.embedding.cosine_distance(query_vector).label("distance")

        stmt = select(Paper, distance).where(Paper.embedding.is_not(None))
        stmt = _apply_filters(stmt, year, author, category)
        stmt = stmt.order_by(distance).limit(limit)

        result = await self.db.execute(stmt)
        # With normalized vectors, similarity = 1 - cosine distance.
        return [
            (paper, 1 - dist) for paper, dist in result.all() if (1 - dist) >= min_score
        ]
