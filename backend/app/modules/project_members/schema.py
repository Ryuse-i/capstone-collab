from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict

from app.modules.projects.schema import ProjectResponse
from app.modules.users.schema import UserResponse
from .model import ProjectRole
from app.modules.member_snapshots.schema import MemberSnapshotResponse


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


class ProjectMember_Project_Response(ProjectMemberResponse):
    projects: ProjectResponse


class ProjectMember_User_Response(ProjectMemberResponse):
    users: UserResponse


class ProjectMemberWithSnapshot(ProjectMemberResponse):
    snapshot: MemberSnapshotResponse
