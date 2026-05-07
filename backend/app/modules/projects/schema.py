from pydantic import BaseModel, ConfigDict
from datetime import datetime
from uuid import UUID


class ProjectBase(BaseModel):
    name: str
    description: str
    created_by: UUID
    advisor: UUID
    instructor: UUID


class ProjectCreate(ProjectBase):
    # Timestamps removed from Create; let the DB/Model handle them
    pass


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    created_by: UUID | None = None
    advisor: UUID | None = None
    instructor: UUID | None = None  # Made optional


class ProjectResponse(ProjectBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
