import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from app.main import app
from app.core.db import Base, get_async_session
from app.core.config import settings

# Use the dedicated test database port (5433)
TEST_DATABASE_URL = (
    f"postgresql+psycopg://root:password@{settings.DB_HOST}:5433/capstone_collab_test"
)

test_engine = create_async_engine(TEST_DATABASE_URL, echo=True)
test_async_session_maker = async_sessionmaker(test_engine, expire_on_commit=False)


@pytest.fixture(scope="session", autouse=True)
async def setup_db():
    """Initializes a clean database schema before the test session starts."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Provides a transactional session for each test."""
    async with test_async_session_maker() as session:
        yield session


@pytest.fixture
async def ac(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Configures the AsyncClient to use the test database session."""

    async def override_get_async_session():
        yield db_session

    app.dependency_overrides[get_async_session] = override_get_async_session
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
async def test_user(ac: AsyncClient):
    """
    Creates a dummy user in the database via the FastAPI Users registration route.
    """
    unique_suffix = uuid.uuid4().hex[:6]
    user_payload = {
        "email": f"test_{unique_suffix}@example.com",
        "username": f"testuser_{unique_suffix}",  # Required by your User model
        "full_name": "Test User",
        "password": "securepassword123",
        "is_active": True,
        "is_superuser": False,
        "is_verified": False,
    }

    # The registration route is /auth/register based on your router setup
    response = await ac.post("/auth/register", json=user_payload)

    # Check for 201 Created
    assert response.status_code == 201, f"User registration failed: {response.text}"

    return response.json()
