from pydantic import BaseModel
from datetime import datetime
from uuid import UUID


class ProjectBase(BaseModel):
    name: str
    description: str
    created_by: UUID | None = None
    advisor: UUID | None = None
    instructor: UUID | None = None


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
    name: str | None = None
    description: str | None = None
    created_by: UUID | None = None
    advisor: UUID | None = None
    instructor: UUID | None = None  # Made optional
    created_at: datetime
    updated_at: datetime


class ProjectMemberCreate(BaseModel):
    id: UUID
    user_id: UUID
    project_id: UUID
    project_role: str
    workload_points: float
    contribution_points: float


class ProjectMemberUpdate(BaseModel):
    user_id: UUID | None = None
    project_id: UUID | None = None
    project_role: str | None = None
    workload_points: float | None = None
    contribution_points: float | None = None


class ProjectMemberResponse(BaseModel):
    id: UUID
    user_id: UUID
    project_id: UUID
    project_role: str
    workload_points: float = 0.0
    contribution_points: float = 0.0
    created_at: datetime
    updated_at: datetime
