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


class PaperResponse(PaperCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)