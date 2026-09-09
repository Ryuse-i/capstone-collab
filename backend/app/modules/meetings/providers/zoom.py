import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

from app.core.config import settings

from .base import (
    MeetingProvider,
    MeetingProviderAPIError,
    MeetingProviderNotConfigured,
    MeetingProviderResult,
)

logger = logging.getLogger(__name__)


class ZoomProvider(MeetingProvider):
    TOKEN_URL = "https://zoom.us/oauth/token"
    API_URL = "https://api.zoom.us/v2"
    REQUEST_TIMEOUT = httpx.Timeout(10.0, connect=5.0)
    TOKEN_EXPIRY_BUFFER = 60

    _cached_token: str | None = None
    _token_expires_at: datetime | None = None
    _token_lock = asyncio.Lock()

    @classmethod
    def _require_configuration(cls) -> tuple[str, str, str]:
        account_id = settings.ZOOM_ACCOUNT_ID
        client_id = settings.ZOOM_CLIENT_ID
        client_secret = settings.ZOOM_CLIENT_SECRET
        if not account_id or not client_id or not client_secret:
            raise MeetingProviderNotConfigured(
                "Zoom credentials are not configured"
            )
        return account_id, client_id, client_secret

    @classmethod
    async def _get_access_token(cls) -> str:
        account_id, client_id, client_secret = cls._require_configuration()
        now = datetime.now(timezone.utc)
        if (
            cls._cached_token
            and cls._token_expires_at
            and cls._token_expires_at > now + timedelta(seconds=cls.TOKEN_EXPIRY_BUFFER)
        ):
            return cls._cached_token

        async with cls._token_lock:
            now = datetime.now(timezone.utc)
            if (
                cls._cached_token
                and cls._token_expires_at
                and cls._token_expires_at
                > now + timedelta(seconds=cls.TOKEN_EXPIRY_BUFFER)
            ):
                return cls._cached_token

            try:
                async with httpx.AsyncClient(timeout=cls.REQUEST_TIMEOUT) as client:
                    response = await client.post(
                        cls.TOKEN_URL,
                        params={
                            "grant_type": "account_credentials",
                            "account_id": account_id,
                        },
                        auth=(client_id, client_secret),
                    )
            except httpx.HTTPError as exc:
                logger.warning("Zoom OAuth token request failed: %s", type(exc).__name__)
                raise MeetingProviderAPIError(
                    "Zoom OAuth token request failed"
                ) from exc

            if response.is_error:
                logger.warning(
                    "Zoom OAuth token request failed with status %s",
                    response.status_code,
                )
                raise MeetingProviderAPIError("Zoom OAuth token request failed")

            try:
                payload = response.json()
                token = payload["access_token"]
                expires_in = int(payload["expires_in"])
            except (ValueError, KeyError, TypeError) as exc:
                logger.warning("Zoom OAuth response was malformed")
                raise MeetingProviderAPIError(
                    "Zoom OAuth response was malformed"
                ) from exc

            if not isinstance(token, str) or not token or expires_in <= 0:
                raise MeetingProviderAPIError("Zoom OAuth response was malformed")

            cls._cached_token = token
            cls._token_expires_at = datetime.now(timezone.utc) + timedelta(
                seconds=expires_in
            )
            return token

    @classmethod
    def _parse_datetime(cls, value: Any) -> datetime | None:
        if value is None:
            return None
        if not isinstance(value, str):
            raise ValueError("invalid Zoom datetime")
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)

    @classmethod
    def _provider_result(
        cls,
        payload: dict[str, Any],
        fallback_start: datetime | None = None,
        fallback_duration: int | None = None,
    ) -> MeetingProviderResult:
        try:
            meeting_id = payload["id"]
            join_url = payload["join_url"]
            start_time = cls._parse_datetime(payload.get("start_time")) or fallback_start
            duration = payload.get("duration", fallback_duration)
            end_time = (
                start_time + timedelta(minutes=int(duration))
                if start_time is not None and duration is not None
                else None
            )
        except (KeyError, TypeError, ValueError) as exc:
            raise MeetingProviderAPIError("Zoom meeting response was malformed") from exc

        if not isinstance(meeting_id, (str, int)) or not isinstance(join_url, str):
            raise MeetingProviderAPIError("Zoom meeting response was malformed")

        return MeetingProviderResult(
            meeting_id=str(meeting_id),
            join_url=join_url,
            host_url=payload.get("start_url"),
            start_time=start_time,
            end_time=end_time,
        )

    async def create_meeting(
        self,
        *,
        topic: str,
        start_time: datetime,
        duration_minutes: int,
        join_url: str | None = None,
    ) -> MeetingProviderResult:
        token = await self._get_access_token()
        payload = {
            "topic": topic,
            "type": 2,
            "start_time": start_time.astimezone(timezone.utc)
            .isoformat()
            .replace("+00:00", "Z"),
            "duration": duration_minutes,
            "timezone": "UTC",
        }
        try:
            async with httpx.AsyncClient(timeout=self.REQUEST_TIMEOUT) as client:
                response = await client.post(
                    f"{self.API_URL}/users/me/meetings",
                    headers={"Authorization": f"Bearer {token}"},
                    json=payload,
                )
        except httpx.HTTPError as exc:
            logger.warning("Zoom meeting creation request failed: %s", type(exc).__name__)
            raise MeetingProviderAPIError("Zoom meeting creation request failed") from exc

        if response.is_error:
            logger.warning(
                "Zoom meeting creation failed with status %s", response.status_code
            )
            raise MeetingProviderAPIError("Zoom meeting creation failed")

        try:
            result = self._provider_result(
                response.json(), fallback_start=start_time, fallback_duration=duration_minutes
            )
        except (ValueError, TypeError) as exc:
            raise MeetingProviderAPIError("Zoom meeting response was malformed") from exc
        logger.info("Zoom meeting creation succeeded: meeting_id=%s", result.meeting_id)
        return result

    async def cancel_meeting(self, provider_meeting_id: str | None) -> None:
        if not provider_meeting_id:
            raise MeetingProviderAPIError("Zoom meeting ID is missing")
        token = await self._get_access_token()
        try:
            async with httpx.AsyncClient(timeout=self.REQUEST_TIMEOUT) as client:
                response = await client.delete(
                    f"{self.API_URL}/meetings/{provider_meeting_id}",
                    headers={"Authorization": f"Bearer {token}"},
                )
        except httpx.HTTPError as exc:
            logger.warning("Zoom meeting cancellation request failed: %s", type(exc).__name__)
            raise MeetingProviderAPIError(
                "Zoom meeting cancellation request failed"
            ) from exc

        if response.is_error:
            logger.warning(
                "Zoom meeting cancellation failed with status %s", response.status_code
            )
            raise MeetingProviderAPIError("Zoom meeting cancellation failed")
        logger.info("Zoom meeting cancellation succeeded: meeting_id=%s", provider_meeting_id)

    async def get_meeting(self, provider_meeting_id: str | None) -> MeetingProviderResult:
        if not provider_meeting_id:
            raise MeetingProviderAPIError("Zoom meeting ID is missing")
        token = await self._get_access_token()
        try:
            async with httpx.AsyncClient(timeout=self.REQUEST_TIMEOUT) as client:
                response = await client.get(
                    f"{self.API_URL}/meetings/{provider_meeting_id}",
                    headers={"Authorization": f"Bearer {token}"},
                )
        except httpx.HTTPError as exc:
            logger.warning("Zoom meeting retrieval request failed: %s", type(exc).__name__)
            raise MeetingProviderAPIError("Zoom meeting retrieval request failed") from exc

        if response.is_error:
            logger.warning(
                "Zoom meeting retrieval failed with status %s", response.status_code
            )
            raise MeetingProviderAPIError("Zoom meeting retrieval failed")

        try:
            return self._provider_result(response.json())
        except (ValueError, TypeError) as exc:
            raise MeetingProviderAPIError("Zoom meeting response was malformed") from exc
