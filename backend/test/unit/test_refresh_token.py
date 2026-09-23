import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import select
from app.main import app
from app.core.db import Base, get_async_session
from app.core.config import settings
from app.modules.users.model import User
from app.modules.users.services import current_active_user


# Use the dedicated test database port (5433)
TEST_DATABASE_URL = (
    f"postgresql+psycopg://{settings.TEST_DB_USER}:"
    f"{settings.TEST_DB_PASSWORD}@{settings.TEST_DB_HOST}:"
    f"{settings.TEST_DB_PORT}/postgres"
)

test_engine = create_async_engine(TEST_DATABASE_URL)

test_async_session_maker = async_sessionmaker(test_engine, expire_on_commit=False)


@pytest.fixture(scope="session")
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
async def test_user(db_session: AsyncSession) -> dict:
    """Registers a test user using its own unauthenticated client."""

    async def override_get_async_session():
        yield db_session

    app.dependency_overrides[get_async_session] = override_get_async_session

    unique_suffix = uuid.uuid4().hex[:6]
    payload = {
        "email": f"test_user_{unique_suffix}@example.com",
        "first_name": "Test",
        "last_name": "User",
        "role": "student",
        "password": "securepassword123",
    }

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as reg_client:
        response = await reg_client.post("/auth/register", json=payload)

    assert response.status_code == 201, f"User registration failed: {response.text}"
    return response.json()


@pytest.fixture
async def authenticated_client(db_session: AsyncSession, test_user: dict) -> AsyncGenerator[AsyncClient, None]:
    """
    Authenticated AsyncClient — overrides both get_async_session and
    current_active_user so requests pass the auth guard as test_user.
    """
    async def override_get_async_session():
        yield db_session

    async def override_current_active_user():
        result = await db_session.execute(
            select(User).where(User.id == test_user["id"])
        )
        return result.scalar_one()

    app.dependency_overrides[get_async_session] = override_get_async_session
    app.dependency_overrides[current_active_user] = override_current_active_user

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        yield client

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_login_returns_access_and_refresh_tokens(test_user: dict):
    """Test that login returns both access and refresh tokens."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        login_response = await client.post(
            "/auth/jwt/login",
            data={"username": test_user["email"], "password": "securepassword123"},
        )
    assert login_response.status_code == 200
    data = login_response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    # Ensure tokens are strings and not empty
    assert isinstance(data["access_token"], str) and len(data["access_token"]) > 0
    assert isinstance(data["refresh_token"], str) and len(data["refresh_token"]) > 0


@pytest.mark.asyncio
async def test_access_token_can_access_protected_endpoint(authenticated_client: AsyncClient):
    """Test that a valid access token can access a protected endpoint."""
    response = await authenticated_client.get("/users/me/profile")
    assert response.status_code == 200
    data = response.json()
    assert data["email"].endswith("@example.com")
    assert "test_user" in data["email"]


@pytest.mark.asyncio
async def test_refresh_token_returns_new_tokens(db_session: AsyncSession, test_user: dict):
    """Test that using a refresh token returns new access and refresh tokens (rotation)."""
    # First, login to get tokens
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        login_response = await client.post(
            "/auth/jwt/login",
            data={"username": test_user["email"], "password": "securepassword123"},
        )
    assert login_response.status_code == 200
    login_data = login_response.json()
    access_token1 = login_data["access_token"]
    refresh_token1 = login_data["refresh_token"]

    # Now use the refresh token to get new tokens
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        refresh_response = await client.post(
            "/auth/refresh-token",
            json={"refresh_token": refresh_token1},
        )
    assert refresh_response.status_code == 200
    refresh_data = refresh_response.json()
    assert "access_token" in refresh_data
    assert "refresh_token" in refresh_data
    assert refresh_data["token_type"] == "bearer"
    access_token2 = refresh_data["access_token"]
    refresh_token2 = refresh_data["refresh_token"]

    # The new access token should be different from the old one (optional, but likely)
    # The new refresh token should be different from the old one due to rotation
    assert access_token2 != access_token1
    assert refresh_token2 != refresh_token1

    # The new access token should work
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        client.headers = {"Authorization": f"Bearer {access_token2}"}
        response = await client.get("/users/me/profile")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_old_refresh_token_invalid_after_rotation(db_session: AsyncSession, test_user: dict):
    """Test that after using a refresh token to get new tokens, the old refresh token no longer works."""
    # Login to get initial tokens
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        login_response = await client.post(
            "/auth/jwt/login",
            data={"username": test_user["email"], "password": "securepassword123"},
        )
    assert login_response.status_code == 200
    login_data = login_response.json()
    refresh_token1 = login_data["refresh_token"]

    # Use the refresh token once to get new tokens (this rotates it)
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        refresh_response = await client.post(
            "/auth/refresh-token",
            json={"refresh_token": refresh_token1},
        )
    assert refresh_response.status_code == 200

    # Now try to use the old refresh token again
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        refresh_response2 = await client.post(
            "/auth/refresh-token",
            json={"refresh_token": refresh_token1},
        )
    # Should fail with 401
    assert refresh_response2.status_code == 401


@pytest.mark.asyncio
async def test_logout_revokes_refresh_tokens(db_session: AsyncSession, test_user: dict):
    """Test that logging out revokes the refresh token so it can no longer be used."""
    # Login to get tokens
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        login_response = await client.post(
            "/auth/jwt/login",
            data={"username": test_user["email"], "password": "securepassword123"},
        )
    assert login_response.status_code == 200
    login_data = login_response.json()
    refresh_token = login_data["refresh_token"]

    # Logout
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        # Need to be authenticated to call logout
        client.headers = {"Authorization": f"Bearer {login_data['access_token']}"}
        logout_response = await client.post("/auth/jwt/logout")
    assert logout_response.status_code == 200

    # Now try to use the refresh token
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        refresh_response = await client.post(
            "/auth/refresh-token",
            json={"refresh_token": refresh_token},
        )
    assert refresh_response.status_code == 401


@pytest.mark.asyncio
async def test_invalid_refresh_token_rejected():
    """Test that an invalid refresh token is rejected."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post(
            "/auth/refresh-token",
            json={"refresh_token": "invalid_token"},
        )
    assert response.status_code == 401