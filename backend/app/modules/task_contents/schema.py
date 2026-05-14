from pydantic import BaseModel
from datetime import datetime
from uuid import UUID


class TaskContentCreate(BaseModel):
    task_id: UUID
    uploaded_by: UUID
    file_name: str
    file_path: str
    file_size: int | None = 0
    mime_type: str | None = None


class TaskContentUpdate(BaseModel):
    file_name: str | None = None
    file_path: str | None = None
    file_size: int | None = None
    mime_type: str | None = None


class TaskContentResponse(BaseModel):
    id: UUID
    task_id: UUID | None
    uploaded_by: UUID | None
    file_name: str | None
    file_path: str | None
    file_size: int | None
    mime_type: str | None
    uploaded_at: datetime

    class ConfigDict:
        from_attributes = True
