from pydantic import BaseModel
from datetime import datetime


class ProjectCreate(BaseModel):
    name: str
    description: str
    created_by: int
    advisor: int
    instructor: int
    created_at: datetime
    updated_at: datetime


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    created_by: int | None = None
    advisor: int | None = None
    instructor: int
    created_at: datetime
    updated_at: datetime


class ProjectResponse(BaseModel):
    name: str
    description: str
    created_by: int
    advisor: int
    instructor: int
    created_at: datetime
    updated_at: datetime
