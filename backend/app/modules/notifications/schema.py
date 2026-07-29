from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from .model import NotificationType


class CreateNotification(BaseModel):
    user_id: UUID
    title: str
    body: str
    type: NotificationType
    invitation_id: UUID


class UpdateNotification(BaseModel):
    user_id: UUID | None = None
    title: str | None = None
    body: str | None = None
    type: NotificationType | None = None
    invitation_id: UUID | None = None
    is_read: bool | None = None


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    user_id: UUID
    title: str
    body: str
    type: NotificationType
    invitation_id: UUID
    is_read: bool
    created_at: datetime
