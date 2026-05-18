from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from .model import NotificationType


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    type: NotificationType
    title: str
    body: str
    reference_id: UUID | None = None
    is_read: bool
    created_at: datetime


class NotificationMarkRead(BaseModel):
    is_read: bool = True
