from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.base_repo import BaseRepo
from app.modules.papers.model import Paper, PaperChunk


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
    ) -> list[Paper]:
        """List papers with optional filters and pagination."""
        query = select(Paper)

        if year is not None:
            query = query.where(Paper.published_date.year == year)
        if author:
            query = query.where(Paper.authors.any(author))
        if keyword:
            query = query.where(Paper.keywords.any(keyword))

        query = query.offset(offset).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())


class PaperChunkRepo(BaseRepo):
    def __init__(self, db: AsyncSession):
        super().__init__(db, PaperChunk)

    async def replace_chunks_for_paper(self, paper_id: int, chunks: list[PaperChunk]) -> None:
        """Delete all existing chunks for a paper and replace with new ones."""
        await self.db.execute(
            delete(PaperChunk).where(PaperChunk.paper_id == paper_id)
        )
        self.db.add_all(chunks)
        await self.db.flush()

    async def search_chunks(
        self,
        query_vector: list[float],
        limit: int = 5,
        min_score: float = 0.0,
        year: int | None = None,
        author: str | None = None,
    ) -> list[tuple[PaperChunk, Paper, float]]:
        """Search for paper chunks using vector similarity."""
        from sqlalchemy import func

        distance = PaperChunk.embedding.cosine_distance(query_vector).label("distance")

        stmt = (
            select(PaperChunk, Paper, distance)
            .join(Paper, Paper.id == PaperChunk.paper_id)
            .order_by(distance)
            .limit(limit)
        )
        if year is not None:
            stmt = stmt.where(func.extract("year", Paper.published_date) == year)
        if author:
            stmt = stmt.where(Paper.authors.any(author))  # exact match on one name

        result = await self.db.execute(stmt)
        # Convert distance to similarity score (1 - distance for cosine distance with normalized vectors)
        return [
            (chunk, paper, 1 - dist)
            for chunk, paper, dist in result.all()
            if (1 - dist) >= min_score
        ]