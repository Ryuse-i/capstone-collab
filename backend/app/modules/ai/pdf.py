# app/modules/ai/pdf.py
import asyncio
from io import BytesIO
from pypdf import PdfReader

def _extract(data: bytes) -> str:
    reader = PdfReader(BytesIO(data))
    return "\n".join(page.extract_text() or "" for page in reader.pages)

async def extract_pdf_text(data: bytes) -> str:
    return await asyncio.to_thread(_extract, data)