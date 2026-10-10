"""
Paper metadata extraction with Gemini.

`extract_paper_info()` is the single entry point the upload flow calls.
If GEMINI_API_KEY is not set, or the call fails, it falls back to the simple
regex heuristics so uploads keep working.
"""

import asyncio
import logging
import re
from datetime import date

from google import genai
from google.genai import types
from pydantic import BaseModel

from app.core.config import settings

logger = logging.getLogger(__name__)

EXTRACTION_PROMPT = """\
You are given the text of a research paper (a thesis, capstone or journal article).
Extract these fields and return JSON only:

- title: the paper's full title.
- abstract: the paper's abstract, which must accurately describe the paper.
  * If the paper has its own abstract (an explicit "Abstract" heading, or an executive summary / primary introductory paragraph), extract it verbatim, then check it against the rest of the paper. It must be consistent with what the paper actually covers.
  * If there is no abstract, or the existing one is clearly wrong, truncated, or doesn't match the paper's content, write a new abstract of 120-200 words in a single paragraph. Give a general overview of what the study is about, what it produced or found, and why it matters. Keep it high level, since the problem, methodology, and conclusion are captured in separate fields. Use only information stated in the text.
- keywords: the author's listed keywords, or 5 relevant topic terms if none are explicitly listed.
- category: one short discipline or field label (e.g., "Machine Learning", "Information Systems").
- research_problem: 1-3 sentences describing the core problem or gap the paper addresses.
- methodology: 1-3 sentences describing the approach, data, algorithms, or methods used.
- authors: list of full author names, one entry per author.
- published_date: YYYY-MM-DD if explicitly stated (use YYYY-MM-01 or YYYY-01-01 if only month/year is provided), otherwise null.

Rules:
- Do NOT invent or fabricate information not present in the text.
- Clean up unnecessary line breaks within single sentences or paragraphs.
- Return null (or an empty list) for any field that cannot be determined.
- The only field you may write yourself is a missing or inaccurate abstract. Base it strictly on the paper's text. Every other field must come from the text.
"""

# Front matter most; keep both for long papers.
HEAD_CHARS = 45_000
TAIL_CHARS = 15_000

_client: genai.Client | None = None


class ExtractedPaper(BaseModel):
    title: str | None = None
    abstract: str | None = None
    keywords: list[str] = []
    category: str | None = None
    research_problem: str | None = None
    methodology: str | None = None
    authors: list[str] = []
    published_date: date | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _client


def _prepare(full_text: str) -> str:
    # Normalize excessive spacing and null characters from PDF extraction
    cleaned = re.sub(r"\x00", "", full_text)
    if len(cleaned) <= HEAD_CHARS + TAIL_CHARS:
        return cleaned
    return cleaned[:HEAD_CHARS] + "\n\n[...]\n\n" + cleaned[-TAIL_CHARS:]


def _call_gemini(text: str) -> str:
    response = _get_client().models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=f"{EXTRACTION_PROMPT}\n\n--- PAPER TEXT ---\n{text}",
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=ExtractedPaper,
            automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
        ),
    )
    return response.text


# ---------- fallback (no API key, or Gemini failed) ----------

_ABSTRACT_RE = re.compile(
    r"(?:abstract|summary)\s*[:\-\u2014]?\s*(.+?)(?=\n\s*(?:keywords?|index terms|1\.?\s*introduction|introduction)\b)",
    re.IGNORECASE | re.DOTALL,
)
_KEYWORDS_RE = re.compile(r"keywords?\s*[:\-\u2014]\s*(.+)", re.IGNORECASE)


def _heuristic_extract(text: str) -> ExtractedPaper:
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    title = lines[0][:300] if lines else None

    abstract = None
    if m := _ABSTRACT_RE.search(text):
        abstract = " ".join(m.group(1).split())

    keywords: list[str] = []
    if m := _KEYWORDS_RE.search(text):
        first_line = m.group(1).splitlines()[0]
        keywords = [k.strip(" .") for k in re.split(r"[;,]", first_line) if k.strip()]

    return ExtractedPaper(title=title, abstract=abstract, keywords=keywords[:15])


async def extract_paper_info(full_text: str) -> ExtractedPaper:
    """Analyze a paper's text and return the fields to pre-fill."""
    text = _prepare(full_text)

    if not settings.GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY not set; using heuristic extraction")
        return _heuristic_extract(text)

    try:
        raw = await asyncio.to_thread(_call_gemini, text)  # SDK call is blocking
        extracted = ExtractedPaper.model_validate_json(raw)
        
        # If abstract wasn't found by Gemini, attempt regex fallback specifically for abstract
        if not extracted.abstract:
            logger.info("Gemini returned null abstract; attempting heuristic recovery")
            fallback_res = _heuristic_extract(text)
            extracted.abstract = fallback_res.abstract
            
        return extracted
    except Exception:
        logger.exception("Gemini extraction failed; using heuristic fallback")
        return _heuristic_extract(text)