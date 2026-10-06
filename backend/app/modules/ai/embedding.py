import asyncio
import logging
from functools import lru_cache

from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

# 384-dim, small and fast on CPU. If you change the model,
# update EMBEDDING_DIM, write a migration, and re-embed everything.
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
EMBEDDING_DIM = 384

# MiniLM defaults to 256 tokens. The paper-level text (title + abstract +
# keywords + problem + methodology + conclusion) is longer, so we raise the
# limit to the model's 512 position-embedding maximum. Anything beyond that
# is truncated, which is why build_embedding_text() caps each field.
MAX_SEQ_LENGTH = 512


@lru_cache(maxsize=1)
def _get_model() -> SentenceTransformer:
    """Load the model once, on first use, and reuse it afterwards."""
    logger.info("Loading embedding model %s", MODEL_NAME)
    model = SentenceTransformer(MODEL_NAME)
    model.max_seq_length = MAX_SEQ_LENGTH
    return model


def _encode(texts: list[str]) -> list[list[float]]:
    # normalize_embeddings=True makes cosine similarity equal to dot product
    vectors = _get_model().encode(
        texts,
        batch_size=32,
        normalize_embeddings=True,
        convert_to_numpy=True,
    )
    return vectors.tolist()


async def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed many texts. Runs in a thread so the event loop isn't blocked."""
    if not texts:
        return []
    return await asyncio.to_thread(_encode, texts)


async def embed_query(query: str) -> list[float]:
    """Embed a single search query."""
    return (await embed_texts([query]))[0]


def _clip(text: str | None, max_chars: int) -> str:
    text = " ".join((text or "").split())
    return text[:max_chars].rstrip()


def build_embedding_text(
    *,
    title: str,
    abstract: str,
    keywords: list[str] | None = None,
    research_problem: str | None = None,
    methodology: str | None = None,
    conclusion: str | None = None,
) -> str:
    """
    The single string that represents a paper in vector space:
    title, abstract, keywords, research problem, methodology, conclusion.

    Each field is clipped so the later fields (methodology, conclusion)
    aren't pushed past the model's token limit by a long abstract.
    """
    parts = [
        ("Title", _clip(title, 300)),
        ("Abstract", _clip(abstract, 900)),
        ("Keywords", ", ".join(keywords or [])),
        ("Research problem", _clip(research_problem, 400)),
        ("Methodology", _clip(methodology, 400)),
        ("Conclusion", _clip(conclusion, 400)),
    ]
    return "\n".join(f"{label}: {value}" for label, value in parts if value)


def chunk_text(text: str, chunk_size: int = 150, overlap: int = 30) -> list[str]:
    """
    Split text into overlapping word-based chunks.

    ~150 words keeps each chunk safely under the token limit. Overlap keeps
    sentences that fall on a boundary from losing their context.
    """
    words = text.split()
    if not words:
        return []

    step = chunk_size - overlap
    chunks = []
    for start in range(0, len(words), step):
        chunks.append(" ".join(words[start : start + chunk_size]))
        if start + chunk_size >= len(words):
            break
    return chunks
