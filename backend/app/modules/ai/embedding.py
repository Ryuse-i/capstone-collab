import asyncio
import logging
from functools import lru_cache

from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

# 384-dim, small and fast on CPU. If you change the model,
# update EMBEDDING_DIM and re-embed everything.
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
EMBEDDING_DIM = 384


@lru_cache(maxsize=1)
def _get_model() -> SentenceTransformer:
    """Load the model once, on first use, and reuse it afterwards."""
    logger.info("Loading embedding model %s", MODEL_NAME)
    return SentenceTransformer(MODEL_NAME)


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


def chunk_text(text: str, chunk_size: int = 150, overlap: int = 30) -> list[str]:
    """
    Split text into overlapping word-based chunks.

    all-MiniLM-L6-v2 truncates input at ~256 tokens, so ~150 words keeps
    each chunk safely under the limit. Overlap keeps sentences that fall
    on a boundary from losing their context.
    """
    words = text.split()
    if not words:
        return []

    step = chunk_size - overlap
    chunks = []
    for start in range(0, len(words), step):
        chunk = " ".join(words[start : start + chunk_size])
        chunks.append(chunk)
        if start + chunk_size >= len(words):
            break
    return chunks