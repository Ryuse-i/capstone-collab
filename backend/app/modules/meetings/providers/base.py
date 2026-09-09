from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class MeetingProviderResult:
    meeting_id: str | None
    join_url: str
    host_url: str | None
    start_time: datetime | None
    end_time: datetime | None


class MeetingProviderError(Exception):
    """Base error for provider selection and provider operations."""


class MeetingProviderNotConfigured(MeetingProviderError):
    """Raised when a provider integration is not implemented or configured."""


class MeetingProviderAPIError(MeetingProviderError):
    """Raised when a configured provider request fails."""


class MeetingProvider(ABC):
    @abstractmethod
    async def create_meeting(
        self,
        *,
        topic: str,
        start_time: datetime,
        duration_minutes: int,
        join_url: str | None = None,
    ) -> MeetingProviderResult:
        raise NotImplementedError

    @abstractmethod
    async def cancel_meeting(self, provider_meeting_id: str | None) -> None:
        raise NotImplementedError

    @abstractmethod
    async def get_meeting(self, provider_meeting_id: str | None) -> MeetingProviderResult:
        raise NotImplementedError
