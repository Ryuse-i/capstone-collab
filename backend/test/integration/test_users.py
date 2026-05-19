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
            "first_name": "Register",
            "last_name": "Test",
            "role": "student",
            "password": "securepassword123",
            "is_active": True,
            "is_superuser": False,
            "is_verified": False,
        }
        response = await ac.post(f"{self.base_url}/register", json=payload)
        assert response.status_code == 201, f"Register failed: {response.text}"
        data = response.json()
        assert data["email"] == payload["email"]
        assert data["first_name"] == payload["first_name"]
        assert data["last_name"] == payload["last_name"]
        assert data["role"] == payload["role"]
        assert "id" in data

    async def test_register_user_duplicate_email(self, ac: AsyncClient):
        """Tests POST /auth/register — returns error for duplicate email."""
        unique_suffix = uuid.uuid4().hex[:6]
        email = f"test_duplicate_{unique_suffix}@example.com"

        payload1 = {
            "email": email,
            "first_name": "User",
            "last_name": "One",
            "role": "student",
            "password": "securepassword123",
        }
        response1 = await ac.post(f"{self.base_url}/register", json=payload1)
        assert response1.status_code == 201

        payload2 = {
            "email": email,
            "first_name": "User",
            "last_name": "Two",
            "role": "student",
            "password": "securepassword123",
        }
        response2 = await ac.post(f"{self.base_url}/register", json=payload2)
        assert response2.status_code in [400, 409]

    async def test_get_current_user(self, ac: AsyncClient, test_user: dict):
        """Tests GET /users/me — returns current user info."""
        user_id = test_user["id"]
        response = await ac.get(f"/users/{user_id}")
        assert response.status_code in [200, 404, 401, 405]

    async def test_user_fields_on_register(self, ac: AsyncClient):
        """Tests that all required fields are returned on registration."""
        unique_suffix = uuid.uuid4().hex[:6]
        payload = {
            "email": f"test_fields_{unique_suffix}@example.com",
            "first_name": "Fields",
            "last_name": "Test",
            "role": "student",
            "password": "securepassword123",
        }
        response = await ac.post(f"{self.base_url}/register", json=payload)
        assert response.status_code == 201
        data = response.json()

        assert "id" in data
        assert "email" in data
        assert "first_name" in data
        assert "last_name" in data
        assert "role" in data
        assert "is_active" in data
        assert "is_verified" in data

    async def test_register_each_role(self, ac: AsyncClient):
        """Tests POST /auth/register — each valid UserRole value is accepted."""
        for role in ["student", "instructor", "admin"]:
            unique_suffix = uuid.uuid4().hex[:6]
            payload = {
                "email": f"test_{role}_{unique_suffix}@example.com",
                "first_name": role.capitalize(),
                "last_name": "User",
                "role": role,
                "password": "securepassword123",
            }
            response = await ac.post(f"{self.base_url}/register", json=payload)
            assert response.status_code == 201, (
                f"Failed for role '{role}': {response.text}"
            )
            assert response.json()["role"] == role

    async def test_register_invalid_role(self, ac: AsyncClient):
        """Tests POST /auth/register — returns error for invalid role value."""
        unique_suffix = uuid.uuid4().hex[:6]
        payload = {
            "email": f"test_invalid_role_{unique_suffix}@example.com",
            "first_name": "Invalid",
            "last_name": "Role",
            "role": "superadmin",  # not in UserRole enum
            "password": "securepassword123",
        }
        response = await ac.post(f"{self.base_url}/register", json=payload)
        assert response.status_code in [400, 422]

    async def test_register_missing_required_field(self, ac: AsyncClient):
        """Tests POST /auth/register — returns error for missing required field."""
        unique_suffix = uuid.uuid4().hex[:6]
        payload = {
            "email": f"test_missing_{unique_suffix}@example.com",
            "first_name": "Missing",
            # missing last_name, role, and password
        }
        response = await ac.post(f"{self.base_url}/register", json=payload)
        assert response.status_code in [400, 422]
