from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_async_session
from app.core.storage import delete_file
from app.modules.papers.schema import (
    PaperCreate,
    PaperResponse,
    PaperSearchResult,
    PaperUpdate,
)
from app.modules.papers.services import PaperService
from app.modules.users.model import User
from app.modules.users.services import current_active_user

papers_router = APIRouter()


@papers_router.get("/", response_model=list[PaperResponse])
async def list_papers(
    limit: int = 50,
    offset: int = 0,
    year: int | None = None,
    author: str | None = None,
    keyword: str | None = None,
    category: str | None = None,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    """List papers with optional filters and pagination."""
    return await PaperService.list_papers(
        db=db,
        limit=limit,
        offset=offset,
        year=year,
        author=author,
        keyword=keyword,
        category=category,
    )


# Must be declared before "/{paper_id}" or "search" is parsed as an id.
@papers_router.get("/search/", response_model=list[PaperSearchResult])
async def search_papers(
    q: str,
    limit: int = 5,
    year: int | None = None,
    author: str | None = None,
    category: str | None = None,
    min_score: float = 0.0,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    """Semantic search over paper embeddings."""
    if not q.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Search query cannot be empty",
        )
    if limit < 1 or limit > 20:
        limit = 5

    return await PaperService.search_papers(
        db=db,
        query=q,
        limit=limit,
        year=year,
        author=author,
        category=category,
        min_score=min_score,
    )


@papers_router.get("/{paper_id}", response_model=PaperResponse)
async def get_paper(
    paper_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    paper = await PaperService.get_paper(db, paper_id)
    if paper is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Paper not found")
    return paper


@papers_router.post(
    "/", response_model=PaperResponse, status_code=status.HTTP_201_CREATED
)
async def create_paper(
    paper: PaperCreate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    return await PaperService.create_paper(db=db, data=paper)


@papers_router.patch("/{paper_id}", response_model=PaperResponse)
async def update_paper(
    paper_id: int,
    paper: PaperUpdate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    updated = await PaperService.update_paper(db=db, paper_id=paper_id, data=paper)
    if updated is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Paper not found")
    return updated


@papers_router.delete("/{paper_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_paper(
    paper_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    file_path = await PaperService.delete_paper(db=db, paper_id=paper_id)
    if file_path:
        await delete_file(file_path)  # don't leave the PDF behind
    return None
