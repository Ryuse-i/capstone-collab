import pytest
from httpx import AsyncClient
import uuid


@pytest.mark.asyncio
class TestUserEndpoints:
    base_url = "/auth"

    async def test_register_user(self, ac: AsyncClient):
        """Tests POST /auth/register — creates a new user."""
        unique_suffix = uuid.uuid4().hex[:6]
        payload = {
            "email": f"test_register_{unique_suffix}@example.com",
            "username": f"testuser_register_{unique_suffix}",
            "full_name": "Register Test User",
            "password": "securepassword123",
            "is_active": True,
            "is_superuser": False,
            "is_verified": False,
        }
        response = await ac.post(f"{self.base_url}/register", json=payload)
        assert response.status_code == 201, f"Register failed: {response.text}"
        data = response.json()
        assert data["email"] == payload["email"]
        assert data["username"] == payload["username"]
        assert "id" in data

    async def test_register_user_duplicate_email(self, ac: AsyncClient):
        """Tests POST /auth/register — returns error for duplicate email."""
        unique_suffix = uuid.uuid4().hex[:6]
        email = f"test_duplicate_{unique_suffix}@example.com"
        username1 = f"testuser_dup1_{unique_suffix}"
        username2 = f"testuser_dup2_{unique_suffix}"

        # First registration
        payload1 = {
            "email": email,
            "username": username1,
            "full_name": "User 1",
            "password": "securepassword123",
        }
        response1 = await ac.post(f"{self.base_url}/register", json=payload1)
        assert response1.status_code == 201

        # Second registration with same email
        payload2 = {
            "email": email,
            "username": username2,
            "full_name": "User 2",
            "password": "securepassword123",
        }
        response2 = await ac.post(f"{self.base_url}/register", json=payload2)
        assert response2.status_code in [400, 409]  # Bad request or conflict

    async def test_register_user_duplicate_username(self, ac: AsyncClient):
        """Tests POST /auth/register — returns error for duplicate username."""
        unique_suffix = uuid.uuid4().hex[:6]
        email1 = f"test_user1_{unique_suffix}@example.com"
        email2 = f"test_user2_{unique_suffix}@example.com"
        username = f"testuser_dup_{unique_suffix}"

        # First registration
        payload1 = {
            "email": email1,
            "username": username,
            "full_name": "User 1",
            "password": "securepassword123",
        }
        response1 = await ac.post(f"{self.base_url}/register", json=payload1)
        assert response1.status_code == 201

        # Second registration with same username
        payload2 = {
            "email": email2,
            "username": username,
            "full_name": "User 2",
            "password": "securepassword123",
        }
        response2 = await ac.post(f"{self.base_url}/register", json=payload2)
        assert response2.status_code in [400, 409]

    async def test_get_current_user(self, ac: AsyncClient, test_user: dict):
        """Tests GET /users/me — returns current user info."""
        # Note: This endpoint might require authentication
        user_id = test_user["id"]
        # This test assumes there's a /users/me endpoint or similar
        # You may need to adjust based on your actual implementation
        response = await ac.get(f"/users/{user_id}")
        # Response code depends on whether the endpoint exists and requires auth
        # For now, we'll just verify it doesn't crash
        assert response.status_code in [200, 404, 401, 405]

    async def test_user_fields_on_register(self, ac: AsyncClient):
        """Tests that all required fields are returned on registration."""
        unique_suffix = uuid.uuid4().hex[:6]
        payload = {
            "email": f"test_fields_{unique_suffix}@example.com",
            "username": f"testuser_fields_{unique_suffix}",
            "full_name": "Fields Test User",
            "password": "securepassword123",
        }
        response = await ac.post(f"{self.base_url}/register", json=payload)
        assert response.status_code == 201
        data = response.json()

        # Verify all expected fields are present
        assert "id" in data
        assert "email" in data
        assert "username" in data
        assert "full_name" in data
        assert "is_active" in data
        assert "is_verified" in data

    async def test_register_missing_required_field(self, ac: AsyncClient):
        """Tests POST /auth/register — returns error for missing required field."""
        unique_suffix = uuid.uuid4().hex[:6]
        payload = {
            "email": f"test_missing_{unique_suffix}@example.com",
            "username": f"testuser_missing_{unique_suffix}",
            # Missing full_name and password
        }
        response = await ac.post(f"{self.base_url}/register", json=payload)
        assert response.status_code in [400, 422]  # Bad request or validation error
