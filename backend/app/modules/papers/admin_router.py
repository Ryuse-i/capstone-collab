from datetime import date
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_async_session
from app.core.storage import delete_file, upload_pdf
from app.modules.ai.extractor import ExtractedPaper, extract_paper_info
from app.modules.ai.pdf import extract_pdf_text
from app.modules.papers.schema import PaperCreate, PaperResponse
from app.modules.papers.services import PaperService
from app.modules.users.services import require_admin

MAX_PDF_BYTES = 25 * 1024 * 1024

admin_papers_router = APIRouter(dependencies=[Depends(require_admin)])


async def _read_pdf(file: UploadFile) -> bytes:
    data = await file.read()
    if len(data) > MAX_PDF_BYTES:
        raise HTTPException(413, "File too large (max 25 MB)")
    if not data.startswith(b"%PDF"):  # don't trust the content-type header alone
        raise HTTPException(400, "Only PDF files are accepted")
    return data


async def _read_text(data: bytes) -> str:
    text = await extract_pdf_text(data)
    if not text.strip():
        raise HTTPException(
            422, "No extractable text in this PDF (is it a scanned image?)"
        )
    return text


@admin_papers_router.post("/extract", response_model=ExtractedPaper)
async def extract_paper(file: UploadFile = File(...)):
    """Step 1: analyze a PDF and return the fields to pre-fill the form.
    Nothing is stored."""
    data = await _read_pdf(file)
    return await extract_paper_info(await _read_text(data))


@admin_papers_router.post(
    "/", response_model=PaperResponse, status_code=status.HTTP_201_CREATED
)
async def upload_paper(
    background_tasks: BackgroundTasks,
    title: str | None = Form(default=None),
    abstract: str | None = Form(default=None),
    keywords: list[str] = Form(default=[]),
    category: str | None = Form(default=None),
    research_problem: str | None = Form(default=None),
    methodology: str | None = Form(default=None),
    conclusion: str | None = Form(default=None),
    authors: list[str] = Form(default=[]),
    adviser: str | None = Form(default=None),
    published_date: date | None = Form(default=None),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_async_session),
):
    """Step 2: store the PDF, create the paper, and queue embedding generation."""
    data = await _read_pdf(file)
    full_text = await _read_text(data)

    # Only call the extractor if title or abstract is missing
    if not title or not abstract:
        extracted = await extract_paper_info(full_text)
    else:
        extracted = None

    final_title = title or (extracted.title if extracted else None)
    final_abstract = abstract or (extracted.abstract if extracted else None)

    if not final_title or not final_abstract:
        raise HTTPException(
            422, "Could not detect a title/abstract; please provide them."
        )

    storage_path = f"papers/{uuid4()}.pdf"
    await upload_pdf(storage_path, data)

    try:
        paper = await PaperService.create_paper(
            db,
            PaperCreate(
                title=final_title,
                abstract=final_abstract,
                keywords=keywords or (extracted.keywords if extracted else []),
                category=category or (extracted.category if extracted else None),
                research_problem=research_problem or (extracted.research_problem if extracted else None),
                methodology=methodology or (extracted.methodology if extracted else None),
                conclusion=conclusion or (extracted.conclusion if extracted else None),
                authors=authors or (extracted.authors if extracted else []),
                adviser=adviser,
                published_date=published_date or (extracted.published_date if extracted else None),
                file_path=storage_path,
            ),
        )

        background_tasks.add_task(
            PaperService.generate_and_store_embedding,
            paper_id=paper.id,
            full_text=full_text,
        )

        return paper

    except Exception:
        await delete_file(storage_path)  # no orphaned files
        raise