from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from .model import NotificationType


class CreateNotification(BaseModel):
    user_id: UUID
    type: NotificationType
    invitation_id: UUID


class UpdateNotification(BaseModel):
    user_id: UUID | None = None
    type: NotificationType | None = None
    invitation_id: UUID | None = None


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    user_id: UUID
    type: NotificationType
    invitation_id: UUID
    created_at: datetime
