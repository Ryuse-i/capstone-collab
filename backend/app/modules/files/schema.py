from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class FileCreate(BaseModel):
    key: str
    filename: str
    size: int
    content_type: str
    uploaded_by: UUID | None = None


class FileResponse(BaseModel):
    id: UUID
    filename: str
    size: int
    content_type: str
    uploaded_by: UUID | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FileUrlResponse(BaseModel):
    url: str