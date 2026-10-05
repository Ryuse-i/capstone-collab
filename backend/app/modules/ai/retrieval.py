from dataclasses import dataclass
from datetime import date

from sqlalchemy import  delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.ai.embedding import (
    chunk_text,
    embed_query,
    embed_texts,
)
from app.modules.papers.model import Paper, PaperChunk




@dataclass
class SearchResult:
    paper_id: int
    title: str
    authors: list[str]
    published_date: date | None
    content: str  # the matching chunk
    score: float  # cosine similarity, higher = more relevant (max 1.0)


async def index_paper(
    db: AsyncSession, paper: Paper, full_text: str | None = None
) -> int:
    """
    Embed title+abstract as chunk 0, then the full text (if any) as further
    chunks. Re-indexing replaces old chunks. Returns the number stored.
    """
    await db.execute(delete(PaperChunk).where(PaperChunk.paper_id == paper.id))

    chunks = [f"{paper.title}\n\n{paper.abstract}"]
    if full_text:
        chunks += chunk_text(full_text)

    vectors = await embed_texts(chunks)
    db.add_all(
        PaperChunk(paper_id=paper.id, chunk_index=i, content=c, embedding=v)
        for i, (c, v) in enumerate(zip(chunks, vectors))
    )
    await db.commit()
    return len(chunks)


async def search_papers(
    db: AsyncSession,
    query: str,
    limit: int = 5,
    min_score: float = 0.0,
    year: int | None = None,
    author: str | None = None,
) -> list[SearchResult]:
    """Return the chunks most semantically similar to the query, with paper metadata."""
    query_vector = await embed_query(query)
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

    rows = (await db.execute(stmt)).all()
    results = [
        SearchResult(
            paper_id=paper.id,
            title=paper.title,
            authors=paper.authors,
            published_date=paper.published_date,
            content=chunk.content,
            score=1 - dist,
        )
        for chunk, paper, dist in rows
    ]
    return [r for r in results if r.score >= min_score]