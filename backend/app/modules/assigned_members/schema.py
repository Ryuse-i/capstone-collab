from pydantic import BaseModel, ConfigDict
from datetime import datetime
from uuid import UUID
from app.modules.users.schema import UserResponse


class AssignedMemberCreate(BaseModel):
    member_id: UUID
    task_id: UUID
    effort_share: float | None = None


class AssignedMemberUpdate(BaseModel):
    member_id: UUID | None = None
    task_id: UUID | None = None
    effort_share: float | None = None


class AssignedMemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    member_id: UUID
    task_id: UUID
    effort_share: float
    created_at: datetime | None = None
    updated_at: datetime | None = None


class AssignedMemberWithUsers(AssignedMemberResponse):
    users: list[UserResponse]
