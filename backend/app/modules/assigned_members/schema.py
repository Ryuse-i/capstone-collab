from pydantic import BaseModel, ConfigDict
from datetime import datetime
from uuid import UUID
from app.modules.tasks.enums import Role


class AssignedMemberCreate(BaseModel):
    user_id: UUID
    task_id: UUID
    role: Role
    effort_share: float


class AssignedMemberUpdate(BaseModel):
    user_id: UUID | None = None
    task_id: UUID | None = None
    role: Role | None = None
    effort_share: float | None = None


class AssignedMemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    user_id: UUID
    task_id: UUID
    role: Role
    effort_share: float
    created_at: datetime | None = None
    updated_at: datetime | None = None
