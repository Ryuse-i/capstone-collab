from supabase import acreate_client, AsyncClient

from app.core.config import settings

BUCKET = "upload"

_client: AsyncClient | None = None


async def get_supabase() -> AsyncClient:
    global _client
    if _client is None:
        _client = await acreate_client(
            settings.SUPABASE_URL, settings.SUPABASE_SECRET_KEY
        )
    return _client


async def upload_pdf(path: str, data: bytes) -> None:
    client = await get_supabase()
    await client.storage.from_(BUCKET).upload(
        path, data, {"content-type": "application/pdf"}
    )


async def delete_file(path: str) -> None:
    client = await get_supabase()
    await client.storage.from_(BUCKET).remove([path])


async def signed_url(path: str, expires: int = 3600) -> str:
    client = await get_supabase()
    res = await client.storage.from_(BUCKET).create_signed_url(path, expires)
    return res["signedURL"]