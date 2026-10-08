import logging
from fastapi.concurrency import run_in_threadpool
from sentence_transformers import SentenceTransformer

from app.core import config

logger = logging.getLogger(__name__)

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
EMBEDDING_DIM = 384
MAX_SEQ_LENGTH = 512


def _load_model() -> SentenceTransformer:
    """Load and configure the model once at module import time."""
    logger.info("Loading embedding model %s", MODEL_NAME)
    # Fast CPU execution via ONNX backend
    model = SentenceTransformer(MODEL_NAME, backend="onnx")
    model.max_seq_length = MAX_SEQ_LENGTH
    return model


# Pre-load the model once at application startup
MODEL = _load_model()


def _encode(texts: list[str]) -> list[list[float]]:
    vectors = MODEL.encode(
        texts,
        batch_size=32,
        normalize_embeddings=True,
        convert_to_numpy=True,
    )
    return vectors.tolist()


async def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed texts asynchronously off the main thread pool."""
    if not texts:
        return []
    return await run_in_threadpool(_encode, texts)


async def embed_query(query: str) -> list[float]:
    """Embed a single query."""
    return (await embed_texts([query]))[0]


def _clip(text: str | None, max_chars: int) -> str:
    text = " ".join((text or "").split())
    return text[:max_chars].rstrip()


def build_embedding_text(
    *,
    title: str,
    abstract: str | None = None,
    keywords: list[str] | None = None,
    research_problem: str | None = None,
    conclusion: str | None = None,
) -> str:
    """
    Build vector representation string using high-signal fields only:
    title, research problem, abstract, keywords, and conclusion.
    """
    parts = [
        ("Title", _clip(title, 200)),
        ("Research Problem", _clip(research_problem, 250)),
        ("Abstract", _clip(abstract, 500)),
        ("Keywords", ", ".join(keywords or [])),
        ("Conclusion", _clip(conclusion, 250)),
    ]
    return "\n".join(f"{label}: {value}" for label, value in parts if value)


def chunk_text(text: str, chunk_size: int = 200, overlap: int = 20, max_chunks: int = 10) -> list[str]:
    """
    Split text into larger word chunks with a maximum cap to reduce vector load.
    """
    words = text.split()
    if not words:
        return []

    step = chunk_size - overlap
    chunks = []
    for start in range(0, len(words), step):
        chunks.append(" ".join(words[start : start + chunk_size]))
        if len(chunks) >= max_chunks or start + chunk_size >= len(words):
            break
    return chunks