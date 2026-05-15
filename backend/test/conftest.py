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
    f"postgresql+psycopg://{settings.TEST_DB_USER}:"
    f"{settings.TEST_DB_PASSWORD}@{settings.TEST_DB_HOST}:"
    f"{settings.TEST_DB_PORT}/postgres"
)

test_engine = create_async_engine(
    TEST_DATABASE_URL,
)

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


# conftest.py


@pytest.fixture
async def test_user(ac: AsyncClient) -> dict:
    unique_suffix = uuid.uuid4().hex[:6]
    payload = {
        "email": f"test_user_{unique_suffix}@example.com",
        "first_name": "Test",
        "last_name": "User",
        "role": "student",
        "password": "securepassword123",
    }
    response = await ac.post("/auth/register", json=payload)
    assert response.status_code == 201, f"User registration failed: {response.text}"
    return response.json()


@pytest.fixture
async def test_project(ac: AsyncClient, test_user: dict) -> dict:
    """Creates a real project in the DB for use as a foreign key in supertask tests."""
    payload = {
        "name": "Test Project",
        "description": "Fixture project for supertask tests",
        "created_by": test_user["id"],
    }
    response = await ac.post("/projects/", json=payload)
    assert response.status_code == 201, f"Project fixture failed: {response.text}"
    return response.json()


@pytest.fixture
async def test_task(ac: AsyncClient, test_user: dict, test_project: dict) -> dict:
    """Creates a real task in the DB for use as a foreign key in task content tests."""
    payload = {
        "name": "Fixture Task",
        "description": "Task fixture for task content tests",
        "created_by": test_user["id"],
        "project_id": test_project["id"],
        "status": "not_started",
        "priority": "low",
        "complexity": "low",
        "complexity_points": 0,
        "category": "development",
        "deadline": "2099-01-01T00:00:00Z",
    }
    response = await ac.post("/tasks/", json=payload)
    assert response.status_code == 201, f"Task fixture failed: {response.text}"
    return response.json()


@pytest.fixture
async def test_supertask(ac: AsyncClient, test_user: dict, test_project: dict) -> dict:
    """Creates a real supertask in the DB for use as a foreign key in tests."""
    from datetime import datetime, timezone

    payload = {
        "name": "Fixture Supertask",
        "description": "Supertask fixture for tests",
        "created_by": test_user["id"],
        "project_id": test_project["id"],
        "deadline": datetime.now(timezone.utc).isoformat(),
    }
    response = await ac.post("/supertasks/", json=payload)
    assert response.status_code == 201, f"Supertask fixture failed: {response.text}"
    return response.json()


@pytest.fixture
async def test_another_user(ac: AsyncClient) -> dict:
    unique_suffix = uuid.uuid4().hex[:6]
    payload = {
        "email": f"test_another_user_{unique_suffix}@example.com",
        "first_name": "Another",
        "last_name": "User",
        "role": "student",
        "password": "securepassword123",
    }
    response = await ac.post("/auth/register", json=payload)
    assert response.status_code == 201, (
        f"Another user registration failed: {response.text}"
    )
    return response.json()


@pytest.fixture
async def test_project_member(
    ac: AsyncClient, test_user: dict, test_project: dict
) -> dict:
    """Creates a project member in the DB for use as a foreign key in member snapshot/activity tests."""
    payload = {
        "id": str(uuid.uuid4()),  # required by ProjectMemberCreate
        "user_id": test_user["id"],
        "project_id": test_project["id"],
        "project_role": "member",
        "workload_points": 0.0,
        "contribution_points": 0.0,
    }
    response = await ac.post("/project_members/", json=payload)
    assert response.status_code == 201, (
        f"Project member fixture failed: {response.text}"
    )
    return response.json()
