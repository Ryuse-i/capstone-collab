"""Indexing (build + store embeddings) and retrieval (semantic search)."""

import re
import numpy as np
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


def _split_sentences(text: str) -> list[str]:
    """Split text into sentences, filtering out short fragments."""
    parts = re.split(r"(?<=[.!?])\s+", text.strip())
    return [p for p in parts if len(p) > 20]


def _cosine(a: list[float] | np.ndarray, b: list[float] | np.ndarray) -> float:
    """Compute cosine similarity between two vectors."""
    a, b = np.asarray(a), np.asarray(b)
    norm_product = np.linalg.norm(a) * np.linalg.norm(b)
    if norm_product == 0:
        return 0.0
    return float(a @ b / norm_product)


async def best_sentences(
    query_vector: list[float], text: str, top_k: int = 2
) -> list[tuple[str, float]]:
    """Score individual sentences against query_vector and return top_k matches."""
    sentences = _split_sentences(text or "")
    if not sentences:
        return []

    vectors = await embed_texts(sentences)
    scored = [(s, _cosine(query_vector, v)) for s, v in zip(sentences, vectors)]
    scored.sort(key=lambda x: x[1], reverse=True)
    return scored[:top_k]


async def embed_paper(paper: Paper) -> None:
    """Build embedding_text from the paper's fields and store its vector.

    Mutates the paper in place (including embedding_status); the caller is
    responsible for flush/commit.
    """
    paper.embedding_text = build_embedding_text(
        title=paper.title,
        abstract=paper.abstract,
        keywords=paper.keywords,
        research_problem=paper.research_problem,
    )
    paper.embedding = (await embed_texts([paper.embedding_text]))[0]
    paper.embedding_status = "ready"


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

    results = []
    for paper, score in rows:
        top_matches = await best_sentences(query_vector, paper.abstract or "", top_k=2)
        
        matching_snippet = (
            top_matches[0][0]
            if top_matches
            else (paper.abstract or "")[:SNIPPET_CHARS]
        )

        results.append(
            PaperSearchResult(
                paper_id=paper.id,
                title=paper.title,
                authors=paper.authors,
                category=paper.category,
                published_date=paper.published_date,
                matching_snippet=matching_snippet,
                matches=[{"text": s, "score": sc} for s, sc in top_matches],
                score=score,
            )
        )

    return results