from pydantic import BaseModel
from datetime import datetime
from uuid import UUID


class SupertaskCreate(BaseModel):
    name: str
    description: str | None = None
    created_by: UUID
    project_id: UUID
    deadline: datetime


class SupertaskUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    created_by: UUID | None = None
    project_id: UUID | None = None
    deadline: datetime | None = None


class SupertaskResponse(BaseModel):
    id: UUID
    name: str
    description: str
    created_by: UUID
    project_id: UUID
    deadline: datetime
    created_at: datetime
    updated_at: datetime

    class ConfigDict:
        from_attributes = True
