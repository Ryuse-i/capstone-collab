import logging

from openai import (
    APIConnectionError,
    APIStatusError,
    APITimeoutError,
    RateLimitError,
)
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
    before_sleep_log,
)

from app.core.config import settings
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

client = AsyncOpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=settings.OPEN_ROUTER_API_KEY,
)


class AICallError(Exception):
    """Raised when the AI provider call fails after retries or is non-retryable."""


@retry(
    retry=retry_if_exception_type(
        (RateLimitError, APITimeoutError, APIConnectionError)
    ),
    stop=stop_after_attempt(3),  # 1 initial attempt + 2 retries
    wait=wait_exponential(multiplier=1, min=1, max=8),
    before_sleep=before_sleep_log(logger, logging.WARNING),
    reraise=True,
)
async def _call_openrouter(
    prompt: str,
    system: str | None,
    model: str,
    max_tokens: int,
):
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    return await client.chat.completions.create(
        model=model,
        max_tokens=max_tokens,
        messages=messages,
    )


async def call_ai(
    prompt: str,
    system: str | None = None,
    model: str = "google/gemma-4-26b-a4b-it:free",
    max_tokens: int = 1024,
) -> str:
    try:
        response = await _call_openrouter(prompt, system, model, max_tokens)
    except RateLimitError as e:
        logger.error("AI call rate limited after retries: %s", e)
        raise AICallError("AI provider rate limit exceeded") from e
    except (APITimeoutError, APIConnectionError) as e:
        logger.error("AI call failed (network/timeout) after retries: %s", e)
        raise AICallError("AI provider unreachable") from e
    except APIStatusError as e:
        # 4xx (bad request, auth, invalid model) — not retried, fail fast
        logger.error(
            "AI call failed with status %s: %s", e.status_code, e.response.text
        )
        raise AICallError(f"AI provider returned error: {e.status_code}") from e
    except Exception as e:
        logger.exception("Unexpected error calling AI provider")
        raise AICallError("Unexpected AI provider error") from e

    if response.choices is None:
        logger.error("RAW RESPONSE (no choices): %s", response.model_dump())
        raise AICallError(f"AI call failed: {getattr(response, 'error', response)}")

    content = response.choices[0].message.content
    if content is None:
        raise AICallError("AI provider returned empty content")

    return content
