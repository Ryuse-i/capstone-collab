from uuid import UUID
from datetime import datetime
from pydantic import BaseModel

from app.modules.projects.schema import ProjectResponse
from app.modules.users.schema import UserResponse


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


class ProjectMemberDetailResponse(BaseModel):
    id: UUID
    user_id: UUID
    project_id: UUID
    project_role: str
    workload_points: float = 0.0
    contribution_points: float = 0.0
    created_at: datetime
    updated_at: datetime

    class ConfigDict:
        from_attributes = True


class ProjectMember_Project_Reponse(ProjectMemberDetailResponse):
    projects: ProjectResponse


class ProjectMember_User_Reponse(ProjectMemberDetailResponse):
    users: UserResponse
