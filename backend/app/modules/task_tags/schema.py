from pydantic import BaseModel
from datetime import datetime
from uuid import UUID


class TagCreate(BaseModel):
    name: str


class TagUpdate(BaseModel):
    name: str | None = None


class TagResponse(BaseModel):
    id: UUID
    name: str
    created_at: datetime
    updated_at: datetime

    class ConfigDict:
        from_attributes = True


class TaskTagCreate(BaseModel):
    task_id: UUID
    tag_id: UUID


class TaskTagUpdate(BaseModel):
    task_id: UUID | None = None
    tag_id: UUID | None = None


class TaskTagResponse(BaseModel):
    id: int
    task_id: UUID
    tag_id: UUID

    class ConfigDict:
        from_attributes = True
