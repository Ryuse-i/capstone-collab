from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

DATABASE_URL = (
    f"postgresql+psycopg://{settings.DB_USER}:"
    f"{settings.DB_PASSWORD}@{settings.DB_HOST}:"
    f"{settings.DB_PORT}/{settings.DB_NAME}?sslmode=require"
)


class Base(DeclarativeBase):
    pass


engine = create_async_engine(DATABASE_URL, connect_args={"prepare_threshold": None})

async_session_maker = async_sessionmaker(engine, expire_on_commit=False)


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session


async def create_db_and_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
