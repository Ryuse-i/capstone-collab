from app.modules.meetings.model import MeetingProvider as MeetingProviderType

from .base import MeetingProvider, MeetingProviderError
from .google_meet import GoogleMeetProvider
from .zoom import ZoomProvider


_PROVIDER_TYPES: dict[MeetingProviderType, type[MeetingProvider]] = {
    MeetingProviderType.ZOOM: ZoomProvider,
    MeetingProviderType.GOOGLE_MEET: GoogleMeetProvider,
}


def get_meeting_provider(provider: MeetingProviderType | str) -> MeetingProvider:
    try:
        provider_type = (
            provider
            if isinstance(provider, MeetingProviderType)
            else MeetingProviderType(provider)
        )
    except ValueError as exc:
        raise MeetingProviderError(f"Unsupported meeting provider: {provider}") from exc

    provider_class = _PROVIDER_TYPES.get(provider_type)
    if provider_class is None:
        raise MeetingProviderError(f"Unsupported meeting provider: {provider}")

    return provider_class()
