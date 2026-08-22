from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict

from app.modules.projects.schema import ProjectResponse
from app.modules.users.schema import UserResponse
from .model import ProjectRole


class ProjectMemberCreate(BaseModel):
    user_id: UUID
    project_id: UUID
    project_role: ProjectRole


class ProjectMemberUpdate(BaseModel):
    user_id: UUID | None = None
    project_id: UUID | None = None
    project_role: ProjectRole | None = None


class ProjectMemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    project_id: UUID
    project_role: ProjectRole


class ProjectMemberDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    user_id: UUID
    project_id: UUID
    project_role: ProjectRole | None = None
    workload_points: float | None = None
    contribution_points: float | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class ProjectMember_Project_Response(ProjectMemberDetailResponse):
    projects: ProjectResponse


class ProjectMember_User_Response(ProjectMemberDetailResponse):
    users: UserResponse
