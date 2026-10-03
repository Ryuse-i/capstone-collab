from pydantic import BaseModel
from datetime import datetime
from uuid import UUID


class TaskCommentCreate(BaseModel):
    task_id: UUID
    author_id: UUID
    content: str


class TaskCommentUpdate(BaseModel):
    task_id: UUID | None = None
    author_id: UUID | None = None
    content: str | None = None


class TaskCommentResponse(BaseModel):
    id: UUID
    task_id: UUID
    author_id: UUID
    content: str
    created_at: datetime
    updated_at: datetime

    class ConfigDict:
        from_attributes = True
