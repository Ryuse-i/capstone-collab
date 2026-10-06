from datetime import date
from pydantic import BaseModel, ConfigDict


class PaperCreate(BaseModel):
    title: str
    abstract: str
    authors: list[str] = []
    adviser: str | None = None
    published_date: date | None = None
    keywords: list[str] = []
    file_path: str | None = None


class PaperUpdate(BaseModel):
    title: str | None = None
    abstract: str | None = None
    authors: list[str] | None = None
    adviser: str | None = None
    published_date: date | None = None
    keywords: list[str] | None = None
    file_path: str | None = None


class PaperResponse(PaperCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


class PaperSearchResult(BaseModel):
    paper_id: int
    title: str
    authors: list[str]
    published_date: date | None
    matching_snippet: str
    score: float  # cosine similarity, higher = more relevant (max 1.0)

    model_config = ConfigDict(from_attributes=True)