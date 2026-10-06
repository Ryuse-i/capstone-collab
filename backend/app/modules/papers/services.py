from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.ai.retrieval import embed_paper, index_chunks, search_papers
from app.modules.papers.model import Paper
from app.modules.papers.repo import PaperRepo
from app.modules.papers.schema import (
    PaperCreate,
    PaperResponse,
    PaperSearchResult,
    PaperUpdate,
)

# Changing any of these changes what the paper "means", so re-embed.
EMBEDDED_FIELDS = {
    "title",
    "abstract",
    "keywords",
    "research_problem",
    "methodology",
    "conclusion",
}


def _not_found() -> HTTPException:
    return HTTPException(status.HTTP_404_NOT_FOUND, "Paper not found")


class PaperService:
    @staticmethod
    async def create_paper(
        db: AsyncSession, data: PaperCreate, full_text: str | None = None
    ) -> PaperResponse:
        """Create a paper, embed it, and (optionally) chunk its full text,
        all in one transaction."""
        paper = Paper(**data.model_dump())
        try:
            await embed_paper(paper)
            db.add(paper)
            await db.flush()  # assigns paper.id
            if full_text:
                await index_chunks(db, paper, full_text)
            await db.commit()
        except Exception:
            await db.rollback()
            raise

        await db.refresh(paper)
        return PaperResponse.model_validate(paper)

    @staticmethod
    async def get_paper(db: AsyncSession, paper_id: int) -> PaperResponse | None:
        paper = await PaperRepo(db).get_by_id(paper_id)
        return PaperResponse.model_validate(paper) if paper else None

    @staticmethod
    async def list_papers(
        db: AsyncSession,
        limit: int = 50,
        offset: int = 0,
        year: int | None = None,
        author: str | None = None,
        keyword: str | None = None,
        category: str | None = None,
    ) -> list[PaperResponse]:
        papers = await PaperRepo(db).list_papers(
            limit=limit,
            offset=offset,
            year=year,
            author=author,
            keyword=keyword,
            category=category,
        )
        return [PaperResponse.model_validate(p) for p in papers]

    @staticmethod
    async def update_paper(
        db: AsyncSession,
        paper_id: int,
        data: PaperUpdate,
        full_text: str | None = None,
    ) -> PaperResponse | None:
        """Partial update. Re-embeds only if an embedded field changed."""
        paper = await PaperRepo(db).get_by_id(paper_id)
        if paper is None:
            return None

        changes = data.model_dump(exclude_unset=True)
        for field, value in changes.items():
            setattr(paper, field, value)

        try:
            if EMBEDDED_FIELDS & changes.keys():
                await embed_paper(paper)
            if full_text:
                await index_chunks(db, paper, full_text)
            await db.commit()
        except Exception:
            await db.rollback()
            raise

        await db.refresh(paper)
        return PaperResponse.model_validate(paper)

    @staticmethod
    async def delete_paper(db: AsyncSession, paper_id: int) -> str | None:
        """Delete a paper (chunks go via CASCADE). Returns its storage path so
        the caller can remove the PDF too."""
        repo = PaperRepo(db)
        paper = await repo.get_by_id(paper_id)
        if paper is None:
            raise _not_found()

        file_path = paper.file_path
        await repo.delete(paper)
        await db.commit()
        return file_path

    @staticmethod
    async def search_papers(
        db: AsyncSession,
        query: str,
        limit: int = 5,
        year: int | None = None,
        author: str | None = None,
        category: str | None = None,
        min_score: float = 0.0,
    ) -> list[PaperSearchResult]:
        return await search_papers(
            db,
            query=query,
            limit=limit,
            min_score=min_score,
            year=year,
            author=author,
            category=category,
        )

    @staticmethod
    async def reindex_paper(
        db: AsyncSession, paper_id: int, full_text: str | None = None
    ) -> None:
        """Rebuild a paper's embedding (e.g. after changing the model or the
        embedding_text recipe), and its chunks if full text is supplied."""
        paper = await PaperRepo(db).get_by_id(paper_id)
        if paper is None:
            raise _not_found()

        try:
            await embed_paper(paper)
            if full_text:
                await index_chunks(db, paper, full_text)
            await db.commit()
        except Exception:
            await db.rollback()
            raise