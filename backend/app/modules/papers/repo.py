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

    async def get_by_id(self, paper_id: int) -> Paper | None:
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
        """Nearest ready papers by cosine distance. Returns (paper, similarity).

        With normalized vectors, similarity = 1 - cosine distance.
        """
        distance = Paper.embedding.cosine_distance(query_vector)
        similarity = (1 - distance).label("score")

        stmt = (
            select(Paper, similarity)
            .where(Paper.embedding_status == "ready")  # fully processed only
            .where(Paper.embedding.is_not(None))
        )
        stmt = _apply_filters(stmt, year, author, category)

        if min_score > 0.0:
            # Filter in SQL so LIMIT applies after the score cutoff.
            stmt = stmt.where((1 - distance) >= min_score)

        stmt = stmt.order_by(distance).limit(limit)

        result = await self.db.execute(stmt)
        return [(row.Paper, float(row.score)) for row in result.all()]

    async def delete(self, paper: Paper) -> None:
        await self.db.delete(paper)

    async def get_latest(self, limit: int = 10, offset: int = 0) -> list[Paper]:
        """Most recently published papers; undated ones go last, ties by upload time."""
        stmt = (
            select(Paper)
            .order_by(
                Paper.published_date.desc().nulls_last(),
                Paper.created_at.desc(),
                Paper.id.desc(),
            )
            .offset(offset)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def count_all(self) -> int:
        result = await self.db.execute(select(func.count(Paper.id)))
        return int(result.scalar_one())