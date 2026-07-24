from uuid import UUID
from datetime import datetime
from pydantic import BaseModel
from app.modules.project_members.model import ProjectRole
from .model import InviteStatus


class ProjectInvitationCreate(BaseModel):
    project_id: UUID
    sender_id: UUID
    email: str
    role: ProjectRole


class ProjectInvitationUpdate(BaseModel):
    project_id: UUID | None = None
    sender_id: UUID | None = None
    email: str | None = None
    role: str | None = None
    status: InviteStatus | None = None


class ProjectInvitationResponse(BaseModel):
    id: UUID | None = None
    project_id: UUID | None = None
    sender_id: UUID | None = None
    email: str | None = None
    role: str | None = None
    status: InviteStatus | None = None
    created_at: datetime | None = None

    class ConfigDict:
        from_attributes = True
