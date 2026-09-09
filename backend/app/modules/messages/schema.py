from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.modules.users.schema import UserResponse


class CreateMessage(BaseModel):
    """What the client sends — sender_id is never trusted from the client."""
    project_id: UUID
    content: str


class CreateMessageInternal(BaseModel):
    """What actually gets persisted — service adds sender_id from current_user."""
    project_id: UUID
    sender_id: UUID
    content: str


class UpdateMessage(BaseModel):
    content: str | None = None


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    sender_id: UUID
    sender: UserResponse
    content: str
    created_at: datetime
