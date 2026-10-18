from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator
from app.modules.project_members.model import ProjectRole

ALLOWED_INVITE_ROLES = {"member", "instructor", "advisor"}


class InviteLinkCreate(BaseModel):
    project_id: UUID
    role: ProjectRole
    expires_in_days: int = Field(default=7, ge=1, le=30)
    max_uses: int | None = Field(default=None, ge=1)  # None = unlimited

    @field_validator("role")
    @classmethod
    def role_must_be_invitable(cls, v: ProjectRole):
        # never allow a link that grants leader/admin
        if v.value not in ALLOWED_INVITE_ROLES:
            raise ValueError("Role cannot be granted through an invite link")
        return v


class InviteLinkResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    created_by: UUID
    role: str
    expires_at: datetime
    max_uses: int | None = None
    use_count: int
    revoked_at: datetime | None = None
    created_at: datetime


class InviteLinkCreated(InviteLinkResponse):
    # raw token, returned only once at creation
    token: str


class InviteLinkPreview(BaseModel):
    project_name: str
    role: str
    inviter_name: str
    valid: bool
    reason: str | None = None  # "expired" | "revoked" | "used_up"


class InviteLinkAccepted(BaseModel):
    project_id: UUID
    role: str
    already_member: bool = False