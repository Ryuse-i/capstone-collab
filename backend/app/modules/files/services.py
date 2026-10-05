import logging
import mimetypes
import re
from pathlib import Path
from uuid import UUID, uuid4

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.storage import get_supabase
from app.modules.files.repo import FileRepo
from app.modules.files.schema import FileCreate

logger = logging.getLogger(__name__)

BUCKET = "upload"
MB = 1024 * 1024

# Reusable groups, so rules stay readable
IMAGES = {"image/png", "image/jpeg", "image/gif", "image/webp"}

DOCUMENTS = {
    "application/pdf",
    "application/msword",                                                              # .doc
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",         # .docx
    "application/vnd.ms-excel",                                                        # .xls
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",               # .xlsx
    "application/vnd.ms-powerpoint",                                                   # .ppt
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",       # .pptx
    "text/plain",                                                                      # .txt
    "text/csv",                                                                        # .csv
    "text/markdown",                                                                   # .md
}

ARCHIVES = {
    "application/zip",
    "application/x-zip-compressed",   # what Windows browsers often send for .zip
}

CODE = {
    "text/x-python",
    "text/javascript",
    "application/javascript",
    "application/json",
    "text/html",
    "text/css",
    "application/x-sh",
    "text/x-java-source",
    "text/x-c",
    "text/x-c++",
    "text/x-csrc",
    "text/x-typescript",
    "application/typescript",
    "application/xml",
    "text/xml",
}

# Different rules per use. Add a new purpose here when a new feature needs one.
RULES: dict[str, dict] = {
    "task_attachment": {
        "types": IMAGES | DOCUMENTS | ARCHIVES,
        "max_size": 10 * MB,
    },
    "resource": {
        "types": IMAGES | DOCUMENTS | ARCHIVES | CODE,
        "max_size": 10 * MB,
    },
    "avatar": {
        "types": {"image/png", "image/jpeg"},
        "max_size": 2 * MB,
    },
}

_SUFFIX_RE = re.compile(r"^\.[a-z0-9]{1,10}$")


def _resolve_content_type(file: UploadFile) -> str | None:
    """Normalize the client content type; fall back to the filename when the
    browser sends nothing useful (common for .md and source files)."""
    ct = (file.content_type or "").split(";")[0].strip().lower()
    if ct in ("", "application/octet-stream"):
        ct = mimetypes.guess_type(file.filename or "")[0] or ct
    return ct or None


class FileService:
    @staticmethod
    async def upload(
        db: AsyncSession,
        file: UploadFile,
        purpose: str,
        uploaded_by: UUID | None = None,
    ):
        rules = RULES.get(purpose)
        if not rules:
            raise ValueError(f"Unknown upload purpose: {purpose}")

        content_type = _resolve_content_type(file)
        if content_type not in rules["types"]:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "File type not allowed")

        # Read at most max_size + 1 bytes so oversized uploads aren't fully buffered
        data = await file.read(rules["max_size"] + 1)
        if len(data) > rules["max_size"]:
            raise HTTPException(
                status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "File too large"
            )

        suffix = Path(file.filename or "").suffix.lower()
        if not _SUFFIX_RE.match(suffix):
            suffix = ""

        key = f"{purpose}/{uuid4()}{suffix}"
        sb = await get_supabase()
        await sb.storage.from_(BUCKET).upload(
            key, data, {"content-type": content_type}
        )

        try:
            return await FileRepo(db).create(
                FileCreate(
                    key=key,
                    filename=(file.filename or "unnamed")[:255],
                    size=len(data),
                    content_type=content_type,
                    uploaded_by=uploaded_by,
                )
            )
        except Exception:
            await FileService.remove_object(key)  # don't leave an orphan
            raise

    @staticmethod
    async def remove_object(key: str) -> None:
        """Best-effort storage cleanup; never masks the original error."""
        try:
            sb = await get_supabase()
            await sb.storage.from_(BUCKET).remove([key])
        except Exception:
            logger.exception("Failed to remove storage object %s", key)

    @staticmethod
    async def get_one(db: AsyncSession, file_id: UUID):
        return await FileRepo(db).get_by_id(file_id)

    @staticmethod
    async def get_url(db: AsyncSession, file_id: UUID, expires_in: int = 3600) -> str:
        record = await FileService.get_one(db, file_id)
        if not record:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "File not found")
        sb = await get_supabase()
        res = await sb.storage.from_(BUCKET).create_signed_url(record.key, expires_in)
        return res.get("signedURL") or res["signedUrl"]  # key name varies by version

    @staticmethod
    async def delete(db: AsyncSession, file_id: UUID):
        record = await FileService.get_one(db, file_id)
        if not record:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "File not found")
        key = record.key
        result = await FileRepo(db).delete(record)  # DB first
        await FileService.remove_object(key)         # then storage
        return result