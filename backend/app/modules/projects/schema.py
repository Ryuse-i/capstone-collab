from pydantic import BaseModel
from datetime import datetime
from uuid import UUID


class ProjectCreate(BaseModel):
    name: str
    description: str
    created_by: UUID
    advisor: UUID | None = None
    instructor: UUID | None = None


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    created_by: UUID | None = None
    advisor: UUID | None = None
    instructor: UUID | None = None  # Made optional


class ProjectResponse(BaseModel):
    id: UUID
    name: str
    description: str
    created_by: UUID
    advisor: UUID | None = None
    instructor: UUID | None = None  # Made optional
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class ConfigDict:
        from_attributes = True


