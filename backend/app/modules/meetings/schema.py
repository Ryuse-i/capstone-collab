from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.modules.meetings.model import MeetingProvider, MeetingStatus


class CreateMeetingRequest(BaseModel):
    project_id: UUID
    provider: MeetingProvider
    topic: str = Field(min_length=1, max_length=255)
    start_time: datetime
    duration_minutes: int = Field(gt=0, le=1440)


class MeetingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    created_by: UUID
    provider: MeetingProvider
    meeting_id: str
    join_url: str
    host_url: str | None
    topic: str
    start_time: datetime | None
    end_time: datetime | None
    status: MeetingStatus
    created_at: datetime | None
    updated_at: datetime | None
