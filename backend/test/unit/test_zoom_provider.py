from datetime import datetime, timezone

import httpx
import pytest
from fastapi import HTTPException

from app.core.config import settings
from app.modules.meetings.providers.base import (
    MeetingProviderAPIError,
    MeetingProviderNotConfigured,
)
from app.modules.meetings.providers.zoom import ZoomProvider
from app.modules.meetings.model import MeetingProvider as MeetingProviderType
from app.modules.meetings.schema import CreateMeetingRequest
from app.modules.meetings.services import MeetingService
from app.modules.users.model import UserRole


class FakeResponse:
    def __init__(self, status_code: int, payload: dict | None = None):
        self.status_code = status_code
        self._payload = payload or {}

    @property
    def is_error(self) -> bool:
        return self.status_code >= 400

    def json(self):
        return self._payload


class FakeAsyncClient:
    responses: list[FakeResponse] = []
    requests: list[tuple[str, str]] = []

    def __init__(self, *args, **kwargs):
        self.timeout = kwargs.get("timeout")

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return None

    async def post(self, url, **kwargs):
        self.requests.append(("POST", url))
        return self.responses.pop(0)

    async def get(self, url, **kwargs):
        self.requests.append(("GET", url))
        return self.responses.pop(0)

    async def delete(self, url, **kwargs):
        self.requests.append(("DELETE", url))
        return self.responses.pop(0)


@pytest.fixture(autouse=True)
def reset_zoom_provider(monkeypatch):
    monkeypatch.setattr(settings, "ZOOM_ACCOUNT_ID", "account")
    monkeypatch.setattr(settings, "ZOOM_CLIENT_ID", "client")
    monkeypatch.setattr(settings, "ZOOM_CLIENT_SECRET", "secret")
    ZoomProvider._cached_token = None
    ZoomProvider._token_expires_at = None
    FakeAsyncClient.responses = []
    FakeAsyncClient.requests = []


@pytest.mark.parametrize(
    "missing_setting",
    ["ZOOM_ACCOUNT_ID", "ZOOM_CLIENT_ID", "ZOOM_CLIENT_SECRET"],
)
def test_missing_zoom_configuration_does_not_request_token(
    monkeypatch, missing_setting
):
    monkeypatch.setattr(settings, missing_setting, None)

    with pytest.raises(MeetingProviderNotConfigured):
        ZoomProvider._require_configuration()


def test_access_token_is_cached(monkeypatch):
    monkeypatch.setattr(
        "app.modules.meetings.providers.zoom.httpx.AsyncClient", FakeAsyncClient
    )
    FakeAsyncClient.responses = [
        FakeResponse(200, {"access_token": "token", "expires_in": 3600})
    ]

    import asyncio

    first = asyncio.run(ZoomProvider._get_access_token())
    second = asyncio.run(ZoomProvider._get_access_token())

    assert first == second == "token"
    assert FakeAsyncClient.requests == [("POST", ZoomProvider.TOKEN_URL)]


def test_expired_access_token_is_refreshed(monkeypatch):
    monkeypatch.setattr(
        "app.modules.meetings.providers.zoom.httpx.AsyncClient", FakeAsyncClient
    )
    ZoomProvider._cached_token = "expired"
    ZoomProvider._token_expires_at = datetime.now(timezone.utc)
    FakeAsyncClient.responses = [
        FakeResponse(200, {"access_token": "fresh", "expires_in": 3600})
    ]

    token = __import__("asyncio").run(ZoomProvider._get_access_token())

    assert token == "fresh"
    assert FakeAsyncClient.requests == [("POST", ZoomProvider.TOKEN_URL)]


def test_create_meeting_maps_zoom_response(monkeypatch):
    monkeypatch.setattr(
        "app.modules.meetings.providers.zoom.httpx.AsyncClient", FakeAsyncClient
    )
    FakeAsyncClient.responses = [
        FakeResponse(200, {"access_token": "token", "expires_in": 3600}),
        FakeResponse(
            201,
            {
                "id": 123,
                "join_url": "https://zoom.example/join",
                "start_url": "https://zoom.example/start",
                "start_time": "2026-09-10T14:00:00Z",
                "duration": 60,
            },
        ),
    ]

    result = __import__("asyncio").run(
        ZoomProvider().create_meeting(
            topic="Weekly meeting",
            start_time=datetime(2026, 9, 10, 14, tzinfo=timezone.utc),
            duration_minutes=60,
        )
    )

    assert result.meeting_id == "123"
    assert result.join_url == "https://zoom.example/join"
    assert result.host_url == "https://zoom.example/start"
    assert result.end_time.isoformat() == "2026-09-10T15:00:00+00:00"


def test_zoom_api_failure_is_translated(monkeypatch):
    monkeypatch.setattr(
        "app.modules.meetings.providers.zoom.httpx.AsyncClient", FakeAsyncClient
    )
    FakeAsyncClient.responses = [
        FakeResponse(200, {"access_token": "token", "expires_in": 3600}),
        FakeResponse(500, {"message": "sensitive provider details"}),
    ]

    with pytest.raises(MeetingProviderAPIError):
        __import__("asyncio").run(
            ZoomProvider().create_meeting(
                topic="Weekly meeting",
                start_time=datetime.now(timezone.utc),
                duration_minutes=30,
            )
        )


def test_cancel_and_get_use_zoom_meeting_id(monkeypatch):
    monkeypatch.setattr(
        "app.modules.meetings.providers.zoom.httpx.AsyncClient", FakeAsyncClient
    )
    FakeAsyncClient.responses = [
        FakeResponse(200, {"access_token": "token", "expires_in": 3600}),
        FakeResponse(204),
        FakeResponse(
            200,
            {
                "id": 123,
                "join_url": "https://zoom.example/join",
                "start_time": "2026-09-10T14:00:00Z",
                "duration": 30,
            },
        ),
    ]

    import asyncio

    provider = ZoomProvider()
    asyncio.run(provider.cancel_meeting("123"))
    result = asyncio.run(provider.get_meeting("123"))

    assert result.meeting_id == "123"
    assert FakeAsyncClient.requests == [
        ("POST", ZoomProvider.TOKEN_URL),
        ("DELETE", f"{ZoomProvider.API_URL}/meetings/123"),
        ("GET", f"{ZoomProvider.API_URL}/meetings/123"),
    ]


def test_network_failure_is_translated(monkeypatch):
    class FailingClient(FakeAsyncClient):
        async def post(self, url, **kwargs):
            raise httpx.ConnectError("connection failed")

    monkeypatch.setattr(
        "app.modules.meetings.providers.zoom.httpx.AsyncClient", FailingClient
    )

    with pytest.raises(MeetingProviderAPIError):
        __import__("asyncio").run(ZoomProvider._get_access_token())


@pytest.mark.asyncio
async def test_service_does_not_persist_when_provider_creation_fails(monkeypatch):
    class FailingProvider:
        async def create_meeting(self, **kwargs):
            raise MeetingProviderAPIError("provider failed")

    class UnexpectedRepo:
        async def create(self, meeting):
            raise AssertionError("meeting was persisted after provider failure")

    async def allow_project_access(*args, **kwargs):
        return None

    monkeypatch.setattr(
        "app.modules.meetings.services.get_meeting_provider",
        lambda provider: FailingProvider(),
    )
    monkeypatch.setattr("app.modules.meetings.services.MeetingRepo", UnexpectedRepo)
    monkeypatch.setattr(MeetingService, "_require_project_access", allow_project_access)

    user = type("UserStub", (), {"id": "user-id", "role": UserRole.STUDENT})()
    request = CreateMeetingRequest(
        project_id="00000000-0000-0000-0000-000000000001",
        provider=MeetingProviderType.ZOOM,
        topic="Weekly meeting",
        start_time=datetime.now(timezone.utc),
        duration_minutes=30,
    )

    with pytest.raises(HTTPException) as error:
        await MeetingService.create_meeting(None, user, request)

    assert error.value.status_code == 502


@pytest.mark.asyncio
async def test_service_does_not_cancel_when_provider_cancellation_fails(monkeypatch):
    class FailingProvider:
        async def cancel_meeting(self, provider_meeting_id):
            raise MeetingProviderAPIError("provider failed")

    async def get_meeting(*args, **kwargs):
        return type(
            "MeetingStub",
            (),
            {
                "project_id": "project-id",
                "provider": MeetingProviderType.ZOOM,
                "meeting_id": "zoom-id",
                "status": "scheduled",
            },
        )()

    async def allow_project_access(*args, **kwargs):
        return None

    monkeypatch.setattr(MeetingService, "get_meeting", get_meeting)
    monkeypatch.setattr(MeetingService, "_require_project_access", allow_project_access)
    monkeypatch.setattr(
        "app.modules.meetings.services.get_meeting_provider",
        lambda provider: FailingProvider(),
    )

    user = type("UserStub", (), {"id": "user-id", "role": UserRole.STUDENT})()

    with pytest.raises(HTTPException) as error:
        await MeetingService.cancel_meeting(None, user, "meeting-id")

    assert error.value.status_code == 502
