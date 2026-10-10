from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class PaperCreate(BaseModel):
    title: str
    abstract: str
    keywords: list[str] = []
    category: str | None = None
    research_problem: str | None = None
    methodology: str | None = None
    authors: list[str] = []
    published_date: date | None = None
    file_path: str | None = None


class PaperUpdate(BaseModel):
    title: str | None = None
    abstract: str | None = None
    keywords: list[str] | None = None
    category: str | None = None
    research_problem: str | None = None
    methodology: str | None = None
    authors: list[str] | None = None
    published_date: date | None = None
    file_path: str | None = None


class PaperResponse(PaperCreate):
    """The embedding vector is intentionally not returned (it's 384 floats)."""

    id: int
    embedding_text: str | None = None
    created_at: datetime | None = None
    model_config = ConfigDict(from_attributes=True)


class PaperSearchResult(BaseModel):
    paper_id: int
    title: str
    authors: list[str]
    category: str | None = None
    published_date: date | None
    matching_snippet: str
    matches: list[dict] = []
    score: float  # cosine similarity, higher = more relevant (max 1.0)

    model_config = ConfigDict(from_attributes=True)
