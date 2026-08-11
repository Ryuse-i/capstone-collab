from app.core.config import settings
from openai import AsyncOpenAI

client = AsyncOpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=settings.OPEN_ROUTER_API_KEY,
)


async def call_ai(
    prompt: str,
    system: str | None = None,
    model: str = "google/gemma-4-26b-a4b-it:free",
    max_tokens: int = 1024,
) -> str:
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    response = await client.chat.completions.create(
        model=model,
        max_tokens=max_tokens,
        messages=messages,
    )

    content = response.choices[0].message.content
    if content is None:
        raise ValueError("AI API returned empty content")
    return content
