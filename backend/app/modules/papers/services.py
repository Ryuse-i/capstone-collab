from datetime import date
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.ai.embedding import embed_query, embed_texts
from app.modules.ai.retrieval import SearchResult
from app.modules.papers.model import Paper, PaperChunk
from app.modules.papers.repo import PaperChunkRepo, PaperRepo
from app.modules.papers.schema import PaperCreate, PaperResponse
from app.modules.users.model import User


class PaperService:
    @staticmethod
    async def create_paper(
        db: AsyncSession, data: PaperCreate, full_text: str | None = None
    ) -> PaperResponse:
        """Create a paper and index its content in a single transaction."""
        # Create the paper record
        repo = PaperRepo(db)
        paper = Paper(**data.model_dump())
        created_paper = await repo.create(paper)

        try:
            # Index the paper (this will create chunks)
            await PaperService._index_paper_contents(
                db, created_paper, full_text
            )
            await db.commit()
        except Exception:
            await db.rollback()
            raise

        await db.refresh(created_paper)
        return PaperResponse.model_validate(created_paper)

    @staticmethod
    async def get_paper(db: AsyncSession, paper_id: int) -> PaperResponse | None:
        """Get a paper by ID."""
        repo = PaperRepo(db)
        paper = await repo.get_by_id(paper_id)
        if paper is None:
            return None
        return PaperResponse.model_validate(paper)

    @staticmethod
    async def list_papers(
        db: AsyncSession,
        limit: int = 50,
        offset: int = 0,
        year: int | None = None,
        author: str | None = None,
        keyword: str | None = None,
    ) -> list[PaperResponse]:
        """List papers with optional filters and pagination."""
        repo = PaperRepo(db)
        papers = await repo.list_papers(
            limit=limit, offset=offset, year=year, author=author, keyword=keyword
        )
        return [PaperResponse.model_validate(paper) for paper in papers]

    @staticmethod
    async def update_paper(
        db: AsyncSession,
        paper_id: int,
        data: PaperCreate,
        full_text: str | None = None,
    ) -> PaperResponse:
        """Update a paper and re-index if title or abstract changed."""
        repo = PaperRepo(db)
        paper = await repo.get_by_id(paper_id)
        if paper is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Paper not found",
            )

        # Check if title or abstract changed (which would require re-indexing)
        title_or_abstract_changed = (
            paper.title != data.title or paper.abstract != data.abstract
        )

        # Update paper fields
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(paper, field, value)

        try:
            if title_or_abstract_changed:
                # Re-index when title or abstract changes
                await PaperService._index_paper_contents(db, paper, full_text)
            else:
                # Just update the paper record
                await db.flush()

            await db.commit()
        except Exception:
            await db.rollback()
            raise

        await db.refresh(paper)
        return PaperResponse.model_validate(paper)

    @staticmethod
    async def delete_paper(db: AsyncSession, paper_id: int) -> None:
        """Delete a paper (chunks will be deleted via CASCADE)."""
        repo = PaperRepo(db)
        paper = await repo.get_by_id(paper_id)
        if paper is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Paper not found",
            )

        await repo.delete(paper)
        await db.commit()

    @staticmethod
    async def search_papers(
        db: AsyncSession,
        query: str,
        limit: int = 5,
        year: int | None = None,
        author: str | None = None,
        min_score: float = 0.0,
    ) -> list[SearchResult]:
        """Search for papers using semantic search."""
        if not query.strip():
            return []

        # Generate query vector
        query_vector = await embed_query(query)

        # Search chunks
        chunk_repo = PaperChunkRepo(db)
        chunk_results = await chunk_repo.search_chunks(
            query_vector=query_vector,
            limit=limit * 3,  # Over-fetch to allow for deduplication
            min_score=min_score,
            year=year,
            author=author,
        )

        # Group results by paper_id and keep the best scoring chunk per paper
        paper_results: dict[int, SearchResult] = {}
        for chunk, paper, score in chunk_results:
            if paper.id not in paper_results or score > paper_results[paper.id].score:
                paper_results[paper.id] = SearchResult(
                    paper_id=paper.id,
                    title=paper.title,
                    authors=paper.authors,
                    published_date=paper.published_date,
                    content=chunk.content,
                    score=score,
                )

        # Convert to list and sort by score descending
        results = list(paper_results.values())
        results.sort(key=lambda r: r.score, reverse=True)

        # Return top 'limit' results
        return results[:limit]

    @staticmethod
    async def _index_paper_contents(
        db: AsyncSession, paper: Paper, full_text: str | None = None
    ) -> None:
        """Index a paper's content (title+abstract and optional full text)."""
        from app.modules.ai.retrieval import index_paper

        # Delegate to the retrieval layer for actual indexing
        await index_paper(db, paper, full_text)

    @staticmethod
    async def reindex_paper(
        db: AsyncSession, paper_id: int, full_text: str | None = None
    ) -> int:
        """Re-index a paper's chunks with new full text."""
        repo = PaperRepo(db)
        paper = await repo.get_by_id(paper_id)
        if paper is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Paper not found",
            )

        # Clear existing chunks and re-index
        chunk_repo = PaperChunkRepo(db)
        await chunk_repo.replace_chunks_for_paper(paper_id, [])

        # Index the paper
        count = await PaperService._index_paper_contents(db, paper, full_text)
        await db.commit()
        return count