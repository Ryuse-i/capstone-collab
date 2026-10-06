# app/modules/papers/admin_router.py
from datetime import date
from uuid import uuid4
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_async_session
from app.core.storage import delete_file, upload_pdf
from app.modules.ai.pdf import extract_pdf_text
from app.modules.papers.schema import PaperCreate, PaperResponse
from app.modules.papers.services import PaperService
from app.modules.users.services import require_admin

MAX_PDF_BYTES = 25 * 1024 * 1024

admin_papers_router = APIRouter(dependencies=[Depends(require_admin)])


@admin_papers_router.post("/", response_model=PaperResponse, status_code=status.HTTP_201_CREATED)
async def upload_paper(
    title: str = Form(...),
    abstract: str = Form(...),
    authors: list[str] = Form(default=[]),
    keywords: list[str] = Form(default=[]),
    adviser: str | None = Form(default=None),
    published_date: date | None = Form(default=None),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_async_session),
):
    data = await file.read()
    if len(data) > MAX_PDF_BYTES:
        raise HTTPException(413, "File too large (max 25 MB)")
    if not data.startswith(b"%PDF"):  # don't trust the content-type header alone
        raise HTTPException(400, "Only PDF files are accepted")

    full_text = await extract_pdf_text(data)

    storage_path = f"papers/{uuid4()}.pdf"
    await upload_pdf(storage_path, data)

    try:
        return await PaperService.create_paper(
            db,
            PaperCreate(
                title=title, abstract=abstract, authors=authors,
                keywords=keywords, adviser=adviser,
                published_date=published_date, file_path=storage_path,
            ),
            full_text=full_text,
        )
    except Exception:
        await delete_file(storage_path)  # no orphaned files
        raise