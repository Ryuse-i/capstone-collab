from pydantic import BaseModel, ConfigDict
from datetime import datetime
from uuid import UUID
from app.modules.users.schema import UserResponse


class AssignedReviewerCreate(BaseModel):
    member_id: UUID
    task_id: UUID


class AssignedReviewerUpdate(BaseModel):
    member_id: UUID | None = None
    task_id: UUID | None = None


class AssignedReviewerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    member_id: UUID
    task_id: UUID
    created_at: datetime | None = None


class AssignedReviewerWithUsers(AssignedReviewerResponse):
    users: list[UserResponse]