import httpx
from fastapi import HTTPException
from supabase import acreate_client, AsyncClient

from app.core.config import settings

BUCKET = "upload"

_client: AsyncClient | None = None

# The SDK's storage client uses HTTP/2 with a 20s timeout, which can stall on
# multi-MB uploads (seen as httpx.WriteTimeout, especially under WSL2).
# Uploads go through a plain HTTP/1.1 client with a longer write timeout instead.
_UPLOAD_TIMEOUT = httpx.Timeout(connect=10.0, write=120.0, read=60.0, pool=10.0)
_UPLOAD_ATTEMPTS = 2


async def get_supabase() -> AsyncClient:
    global _client
    if _client is None:
        _client = await acreate_client(
            settings.SUPABASE_URL, settings.SUPABASE_SECRET_KEY
        )
    return _client


async def upload_pdf(path: str, data: bytes) -> None:
    url = f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/{BUCKET}/{path}"
    headers = {
        "apikey": settings.SUPABASE_SECRET_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SECRET_KEY}",
        "Content-Type": "application/pdf",
        "x-upsert": "false",
    }

    last_exc: Exception | None = None
    for _ in range(_UPLOAD_ATTEMPTS):
        try:
            async with httpx.AsyncClient(http2=False, timeout=_UPLOAD_TIMEOUT) as http:
                resp = await http.post(url, content=data, headers=headers)
        except httpx.TimeoutException as exc:
            last_exc = exc
            continue
        except httpx.HTTPError as exc:
            raise HTTPException(502, f"Storage upload failed: {exc}") from exc

        if resp.status_code >= 400:
            raise HTTPException(
                502, f"Storage upload failed ({resp.status_code}): {resp.text}"
            )
        return

    raise HTTPException(
        504, "Uploading the file to storage timed out. Please try again."
    ) from last_exc


async def delete_file(path: str) -> None:
    client = await get_supabase()
    await client.storage.from_(BUCKET).remove([path])


async def signed_url(path: str, expires: int = 3600) -> str:
    client = await get_supabase()
    res = await client.storage.from_(BUCKET).create_signed_url(path, expires)
    return res["signedURL"]