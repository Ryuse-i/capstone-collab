from app.core.storage import get_supabase

BUCKET = "upload"


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