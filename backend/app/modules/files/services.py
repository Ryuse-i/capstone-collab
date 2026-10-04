from pathlib import Path
from uuid import UUID, uuid4
from fastapi import HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.storage import get_supabase
from app.modules.files.repo import FileRepo
from app.modules.files.schema import FileCreate

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

# Different rules per use. Add a new purpose here when a new feature needs one.
RULES: dict[str, dict] = {
    "task_attachment": {
        "types": IMAGES | DOCUMENTS | ARCHIVES,
        "max_size": 10 * MB,
    },
    "avatar": {
        "types": {"image/png", "image/jpeg"},
        "max_size": 2 * MB,
    },
}


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

        if file.content_type not in rules["types"]:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "File type not allowed")

        data = await file.read()
        if len(data) > rules["max_size"]:
            raise HTTPException(
                status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "File too large"
            )

        key = f"{purpose}/{uuid4()}{Path(file.filename or '').suffix}"
        sb = await get_supabase()
        await sb.storage.from_(BUCKET).upload(
            key, data, {"content-type": file.content_type}
        )

        repo = FileRepo(db)
        try:
            return await repo.create(
                FileCreate(
                    key=key,
                    filename=file.filename or "unnamed",
                    size=len(data),
                    content_type=file.content_type,
                    uploaded_by=uploaded_by,
                )
            )
        except Exception:
            await sb.storage.from_(BUCKET).remove([key])  # don't leave an orphan
            raise

    @staticmethod
    async def get_one(db: AsyncSession, file_id: UUID):
        repo = FileRepo(db)
        return await repo.get_by_id(file_id)

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
        sb = await get_supabase()
        await sb.storage.from_(BUCKET).remove([record.key])
        repo = FileRepo(db)
        return await repo.delete(record)