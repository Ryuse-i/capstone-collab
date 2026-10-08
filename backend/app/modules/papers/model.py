from datetime import date, datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    ARRAY,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.modules.ai.embedding import EMBEDDING_DIM


class Paper(Base):
    __tablename__ = "papers"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(Text, index=True)
    abstract: Mapped[str] = mapped_column(Text)
    keywords: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)
    category: Mapped[str | None] = mapped_column(Text, nullable=True, index=True)
    research_problem: Mapped[str | None] = mapped_column(Text, nullable=True)
    methodology: Mapped[str | None] = mapped_column(Text, nullable=True)
    conclusion: Mapped[str | None] = mapped_column(Text, nullable=True)
    authors: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)
    published_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    file_path: Mapped[str | None] = mapped_column(Text, nullable=True)  # Supabase path

    # Embedding metadata and status
    embedding_status: Mapped[str] = mapped_column(
        String(20), default="pending", server_default="pending", index=True
    )
    embedding_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    embedding: Mapped[list[float] | None] = mapped_column(
        Vector(EMBEDDING_DIM), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    __table_args__ = (
        Index(
            "ix_papers_embedding_hnsw",
            "embedding",
            postgresql_using="hnsw",
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
    )


class PaperChunk(Base):
    """Full-text passages, for passage-level search later. Optional."""

    __tablename__ = "paper_chunks"

    id: Mapped[int] = mapped_column(primary_key=True)
    paper_id: Mapped[int] = mapped_column(
        ForeignKey("papers.id", ondelete="CASCADE"), index=True
    )
    chunk_index: Mapped[int] = mapped_column(Integer)
    content: Mapped[str] = mapped_column(Text)
    embedding: Mapped[list[float]] = mapped_column(Vector(EMBEDDING_DIM))

    paper: Mapped["Paper"] = relationship("Paper")