from datetime import datetime, timezone
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.modules.meetings.model import MeetingProvider
from app.modules.meetings.providers.base import MeetingProviderAPIError
from app.modules.meetings.providers.google_meet import GoogleMeetProvider
from app.modules.meetings.schema import CreateMeetingRequest
from app.modules.meetings.services import MeetingService
from app.modules.users.model import UserRole


@pytest.mark.asyncio
async def test_valid_google_meet_url_is_normalized_without_network():
    result = await GoogleMeetProvider().create_meeting(
        topic="Weekly meeting",
        start_time=datetime(2026, 9, 10, 19, tzinfo=timezone.utc),
        duration_minutes=60,
        join_url="https://meet.google.com/abc-defg-hij",
    )

    assert result.meeting_id is None
    assert result.join_url == "https://meet.google.com/abc-defg-hij"
    assert result.host_url is None
    assert result.end_time.isoformat() == "2026-09-10T20:00:00+00:00"


@pytest.mark.parametrize(
    "join_url",
    [
        "https://example.com/abc-defg-hij",
        "https://zoom.us/j/123456789",
        "http://meet.google.com/abc-defg-hij",
        "not-a-url",
    ],
)
@pytest.mark.asyncio
async def test_invalid_google_meet_urls_are_rejected(join_url):
    with pytest.raises(MeetingProviderAPIError):
        await GoogleMeetProvider().create_meeting(
            topic="Weekly meeting",
            start_time=datetime.now(timezone.utc),
            duration_minutes=60,
            join_url=join_url,
        )


@pytest.mark.asyncio
async def test_google_meet_cancellation_is_local_only():
    assert await GoogleMeetProvider().cancel_meeting(None) is None


def test_google_meet_request_requires_join_url():
    with pytest.raises(ValidationError):
        CreateMeetingRequest(
            project_id="00000000-0000-0000-0000-000000000001",
            provider=MeetingProvider.GOOGLE_MEET,
            topic="Weekly meeting",
            start_time=datetime.now(timezone.utc),
            duration_minutes=60,
        )


def test_google_meet_request_rejects_invalid_url():
    with pytest.raises(ValidationError):
        CreateMeetingRequest(
            project_id="00000000-0000-0000-0000-000000000001",
            provider=MeetingProvider.GOOGLE_MEET,
            topic="Weekly meeting",
            start_time=datetime.now(timezone.utc),
            duration_minutes=60,
            join_url="https://example.com/not-google-meet",
        )


def test_zoom_request_does_not_require_join_url():
    request = CreateMeetingRequest(
        project_id="00000000-0000-0000-0000-000000000001",
        provider=MeetingProvider.ZOOM,
        topic="Weekly meeting",
        start_time=datetime.now(timezone.utc),
        duration_minutes=60,
    )

    assert request.join_url is None


@pytest.mark.asyncio
async def test_google_meet_service_persists_valid_manual_url(monkeypatch):
    async def allow_project_access(*args, **kwargs):
        return None

    saved = []

    class FakeRepo:
        def __init__(self, db):
            pass

        async def create(self, meeting):
            saved.append(meeting)
            return meeting

    monkeypatch.setattr(MeetingService, "_require_project_access", allow_project_access)
    monkeypatch.setattr("app.modules.meetings.services.MeetingRepo", FakeRepo)

    request = CreateMeetingRequest(
        project_id="00000000-0000-0000-0000-000000000001",
        provider=MeetingProvider.GOOGLE_MEET,
        topic="Weekly meeting",
        start_time=datetime.now(timezone.utc),
        duration_minutes=60,
        join_url="https://meet.google.com/abc-defg-hij",
    )
    user = type(
        "UserStub",
        (),
        {"id": "00000000-0000-0000-0000-000000000002", "role": UserRole.ADMIN},
    )()

    meeting = await MeetingService.create_meeting(None, user, request)

    assert saved == [meeting]
    assert meeting.meeting_id is None
    assert meeting.join_url == request.join_url
    assert meeting.host_url is None


@pytest.mark.asyncio
async def test_invalid_google_meet_url_is_not_persisted(monkeypatch):
    async def allow_project_access(*args, **kwargs):
        return None

    class UnexpectedRepo:
        def __init__(self, db):
            pass

        async def create(self, meeting):
            raise AssertionError("invalid Google Meet URL was persisted")

    monkeypatch.setattr(MeetingService, "_require_project_access", allow_project_access)
    monkeypatch.setattr("app.modules.meetings.services.MeetingRepo", UnexpectedRepo)

    request = SimpleNamespace(
        project_id="00000000-0000-0000-0000-000000000001",
        provider=MeetingProvider.GOOGLE_MEET,
        topic="Weekly meeting",
        start_time=datetime.now(timezone.utc),
        duration_minutes=60,
        join_url="https://example.com/not-google-meet",
    )
    user = type("UserStub", (), {"id": "user-id", "role": UserRole.ADMIN})()

    with pytest.raises(HTTPException) as error:
        await MeetingService.create_meeting(None, user, request)

    assert error.value.status_code == 502
