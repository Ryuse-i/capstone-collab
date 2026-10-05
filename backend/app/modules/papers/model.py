from datetime import date, datetime

from sqlalchemy import ARRAY, Date, DateTime, Text, func, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from datetime import date

from pgvector.sqlalchemy import Vector
from sqlalchemy.orm import Mapped, mapped_column

from app.modules.ai.embedding import (
    EMBEDDING_DIM,
)

from app.core.db import Base  


class Paper(Base):
    __tablename__ = "papers"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(Text, index=True)
    abstract: Mapped[str] = mapped_column(Text)
    authors: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)
    adviser: Mapped[str | None] = mapped_column(Text, nullable=True)
    published_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    keywords: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)
    file_path: Mapped[str | None] = mapped_column(Text, nullable=True)  # Supabase Storage path
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class PaperChunk(Base):
    __tablename__ = "paper_chunks"

    id: Mapped[int] = mapped_column(primary_key=True)
    paper_id: Mapped[int] = mapped_column(
        ForeignKey("papers.id", ondelete="CASCADE"), index=True
    )
    chunk_index: Mapped[int] = mapped_column(Integer)
    content: Mapped[str] = mapped_column(Text)
    embedding: Mapped[list[float]] = mapped_column(Vector(EMBEDDING_DIM))