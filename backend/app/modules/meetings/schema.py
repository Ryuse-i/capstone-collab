from datetime import datetime
from urllib.parse import urlparse
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.modules.meetings.model import MeetingProvider, MeetingStatus


class CreateMeetingRequest(BaseModel):
    project_id: UUID
    provider: MeetingProvider
    topic: str = Field(min_length=1, max_length=255)
    start_time: datetime
    duration_minutes: int = Field(gt=0, le=1440)
    join_url: str | None = None

    @model_validator(mode="after")
    def validate_manual_google_meet_url(self):
        if self.provider.value == "google_meet" and not self.join_url:
            raise ValueError("join_url is required for Google Meet")
        if self.provider.value == "google_meet" and self.join_url:
            parsed = urlparse(self.join_url)
            if (
                parsed.scheme != "https"
                or parsed.hostname != "meet.google.com"
                or not parsed.path
            ):
                raise ValueError(
                    "Invalid Google Meet URL. Please provide a valid https://meet.google.com/... meeting link."
                )
        return self


class MeetingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    created_by: UUID
    provider: MeetingProvider
    meeting_id: str | None
    join_url: str
    host_url: str | None
    topic: str
    start_time: datetime | None
    end_time: datetime | None
    status: MeetingStatus
    created_at: datetime | None
    updated_at: datetime | None
