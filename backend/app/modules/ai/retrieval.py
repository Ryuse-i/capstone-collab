"""Indexing (build + store embeddings) and retrieval (semantic search)."""

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.ai.embedding import (
    build_embedding_text,
    chunk_text,
    embed_query,
    embed_texts,
)
from app.modules.papers.model import Paper, PaperChunk
from app.modules.papers.repo import PaperRepo
from app.modules.papers.schema import PaperSearchResult

SNIPPET_CHARS = 300


async def embed_paper(paper: Paper) -> None:
    """Build embedding_text from the paper's fields and store its vector.

    Mutates the paper in place; the caller is responsible for flush/commit.
    """
    paper.embedding_text = build_embedding_text(
        title=paper.title,
        abstract=paper.abstract,
        keywords=paper.keywords,
        research_problem=paper.research_problem,
        methodology=paper.methodology,
        conclusion=paper.conclusion,
    )
    paper.embedding = (await embed_texts([paper.embedding_text]))[0]


async def index_chunks(db: AsyncSession, paper: Paper, full_text: str) -> int:
    """Replace a paper's full-text chunks. Returns the number stored."""
    await db.execute(delete(PaperChunk).where(PaperChunk.paper_id == paper.id))

    chunks = chunk_text(full_text)
    if not chunks:
        return 0

    vectors = await embed_texts(chunks)
    db.add_all(
        PaperChunk(paper_id=paper.id, chunk_index=i, content=c, embedding=v)
        for i, (c, v) in enumerate(zip(chunks, vectors))
    )
    await db.flush()
    return len(chunks)


async def search_papers(
    db: AsyncSession,
    query: str,
    limit: int = 5,
    min_score: float = 0.0,
    year: int | None = None,
    author: str | None = None,
    category: str | None = None,
) -> list[PaperSearchResult]:
    """Return the papers most semantically similar to the query."""
    if not query.strip():
        return []

    query_vector = await embed_query(query)
    rows = await PaperRepo(db).search_by_embedding(
        query_vector=query_vector,
        limit=limit,
        min_score=min_score,
        year=year,
        author=author,
        category=category,
    )
    return [
        PaperSearchResult(
            paper_id=paper.id,
            title=paper.title,
            authors=paper.authors,
            category=paper.category,
            published_date=paper.published_date,
            matching_snippet=paper.abstract[:SNIPPET_CHARS],
            score=score,
        )
        for paper, score in rows
    ]
