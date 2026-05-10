from pydantic import BaseModel
from datetime import datetime
from uuid import UUID


class ProjectCreate(BaseModel):
    name: str
    description: str
    created_by: UUID
    advisor: UUID
    instructor: UUID
    created_at: datetime
    updated_at: datetime


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    created_by: UUID | None = None
    advisor: UUID | None = None
    instructor: UUID | None = None
    created_at: datetime
    updated_at: datetime


class ProjectResponse(BaseModel):
    name: str
    description: str
    created_by: UUID
    advisor: UUID
    instructor: UUID
    created_at: datetime
    updated_at: datetime


class ProjectMemberCreate(BaseModel):
    user_id: UUID
    project_id: UUID
