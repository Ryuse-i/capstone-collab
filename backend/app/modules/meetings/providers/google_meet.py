from datetime import datetime, timedelta
from urllib.parse import urlparse

from .base import MeetingProvider, MeetingProviderAPIError, MeetingProviderResult


class GoogleMeetProvider(MeetingProvider):
    @staticmethod
    def _validate_join_url(join_url: str) -> str:
        parsed = urlparse(join_url)
        if (
            parsed.scheme != "https"
            or parsed.hostname != "meet.google.com"
            or not parsed.path
        ):
            raise MeetingProviderAPIError(
                "Invalid Google Meet URL. Please provide a valid https://meet.google.com/... meeting link."
            )
        return join_url

    async def create_meeting(
        self,
        *,
        topic: str,
        start_time: datetime,
        duration_minutes: int,
        join_url: str | None = None,
    ) -> MeetingProviderResult:
        if not join_url:
            raise MeetingProviderAPIError(
                "A Google Meet URL is required for manual Google Meet meetings"
            )

        return MeetingProviderResult(
            meeting_id=None,
            join_url=self._validate_join_url(join_url),
            host_url=None,
            start_time=start_time,
            end_time=start_time + timedelta(minutes=duration_minutes),
        )

    async def cancel_meeting(self, provider_meeting_id: str | None) -> None:
        # Google Meet sessions are created externally; cancellation is local only.
        return None

    async def get_meeting(self, provider_meeting_id: str | None) -> MeetingProviderResult:
        raise MeetingProviderAPIError(
            "Google Meet details are stored locally and are not retrieved from Google"
        )
