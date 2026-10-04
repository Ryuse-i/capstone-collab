import os
from supabase import acreate_client, AsyncClient
from app.core.config import settings

_client: AsyncClient | None = None

async def get_supabase() -> AsyncClient:
    global _client
    if _client is None:
        _client = await acreate_client(
            settings.SUPABASE_URL, settings.SUPABASE_SECRET_KEY
            )
    return _client