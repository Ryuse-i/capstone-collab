import logging
from enum import Enum
from openai import (
    APIConnectionError,
    APIStatusError,
    APITimeoutError,
    RateLimitError,
    AsyncOpenAI,
)
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
    before_sleep_log,
)
from app.core.config import settings

logger = logging.getLogger(__name__)


class AICallError(Exception):
    """Raised when the AI provider call fails after retries or is non-retryable."""


class AIProvider(str, Enum):
    OPENROUTER = "openrouter"
    GEMINI = "gemini"


_CLIENTS: dict[AIProvider, AsyncOpenAI] = {
    AIProvider.OPENROUTER: AsyncOpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=settings.OPEN_ROUTER_API_KEY,
    ),
    AIProvider.GEMINI: AsyncOpenAI(
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        api_key=settings.GEMINI_API_KEY,
    ),
}

_DEFAULT_MODELS: dict[AIProvider, str] = {
    AIProvider.OPENROUTER: "google/gemma-4-26b-a4b-it:free",
    AIProvider.GEMINI: "gemini-3.5-flash-lite",
}


@retry(
    retry=retry_if_exception_type(
        (RateLimitError, APITimeoutError, APIConnectionError)
    ),
    stop=stop_after_attempt(3),  # 1 initial attempt + 2 retries
    wait=wait_exponential(multiplier=1, min=1, max=8),
    before_sleep=before_sleep_log(logger, logging.WARNING),
    reraise=True,
)
async def _call_provider(
    client: AsyncOpenAI,
    prompt: str,
    system: str | None,
    model: str,
    max_tokens: int,
    reasoning_effort: str | None = None,
    provider: AIProvider | None = None,
):
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    kwargs = {}
    # reasoning_effort is a Gemini-specific OpenAI-compat extension.
    # Sending it to other providers (e.g. OpenRouter) can 400 or be
    # silently ignored depending on the model, so only forward it here.
    if reasoning_effort is not None and provider == AIProvider.GEMINI:
        kwargs["reasoning_effort"] = reasoning_effort

    return await client.chat.completions.create(
        model=model,
        max_tokens=max_tokens,
        messages=messages,
        **kwargs,
    )


async def call_ai(
    prompt: str,
    system: str | None = None,
    provider: AIProvider = AIProvider.GEMINI,
    model: str | None = None,
    max_tokens: int = 4000,
    reasoning_effort: str | None = None,
) -> str:
    client = _CLIENTS[provider]
    resolved_model = model or _DEFAULT_MODELS[provider]
    try:
        response = await _call_provider(
            client,
            prompt,
            system,
            resolved_model,
            max_tokens,
            reasoning_effort=reasoning_effort,
            provider=provider,
        )
    except RateLimitError as e:
        logger.error("AI call rate limited after retries (%s): %s", provider.value, e)
        raise AICallError("AI provider rate limit exceeded") from e
    except (APITimeoutError, APIConnectionError) as e:
        logger.error(
            "AI call failed (network/timeout) after retries (%s): %s", provider.value, e
        )
        raise AICallError("AI provider unreachable") from e
    except APIStatusError as e:
        logger.error(
            "AI call failed with status %s (%s): %s",
            e.status_code,
            provider.value,
            e.response.text,
        )
        raise AICallError(f"AI provider returned error: {e.status_code}") from e
    except Exception as e:
        logger.exception("Unexpected error calling AI provider (%s)", provider.value)
        raise AICallError("Unexpected AI provider error") from e
    if response.choices is None:
        logger.error(
            "RAW RESPONSE (no choices, %s): %s", provider.value, response.model_dump()
        )
        raise AICallError(f"AI call failed: {getattr(response, 'error', response)}")
    content = response.choices[0].message.content
    if content is None:
        raise AICallError("AI provider returned empty content")
    return content
