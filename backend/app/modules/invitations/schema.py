from uuid import UUID
from datetime import datetime
from pydantic import BaseModel


class ProjectInvitationCreate(BaseModel):
    project_id: UUID
    sender_id: UUID
    email: str
    role: str = "member"  # or use ProjectRole enum


class ProjectInvitationUpdate(BaseModel):
    email: str | None = None
    role: str | None = None
    status: str | None = None  # pending, accepted, declined


class ProjectInvitationResponse(BaseModel):
    id: UUID
    project_id: UUID
    sender_id: UUID
    email: str
    role: str
    status: str
    created_at: datetime

    class ConfigDict:
        from_attributes = True

