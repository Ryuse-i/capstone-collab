import pytest
from httpx import AsyncClient
from datetime import datetime, timezone


@pytest.mark.asyncio
class TestProjectEndpoints:
    base_url = "/projects"

    async def test_create_project(self, ac: AsyncClient, test_user: dict):
        user_id = test_user["id"]  # This is a UUID string
        payload = {
            "name": "Integration Test Project",
            "description": "Testing with real UUIDs",
            "created_by": user_id,
            "advisor": user_id,
            "instructor": user_id,
        }

        response = await ac.post(f"{self.base_url}/", json=payload)
        assert response.status_code in [200, 201], f"Create failed: {response.text}"

        data = response.json()
        assert data["name"] == "Integration Test Project"
        assert "id" in data

    async def test_get_one_project(self, ac: AsyncClient, test_user: dict):
        """Tests GET /projects/{project_id}."""
        user_id = test_user["id"]
        payload = {
            "name": "Fetch Test",
            "description": "...",
            "created_by": user_id,
            "advisor": user_id,
            "instructor": user_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        create_res = await ac.post(f"{self.base_url}/", json=payload)
        project_id = create_res.json()["id"]

        response = await ac.get(f"{self.base_url}/{project_id}")
        assert response.status_code == 200
        assert response.json()["id"] == project_id

    async def test_update_project(self, ac: AsyncClient, test_user: dict):
        """Tests PATCH /projects/{project_id}."""
        user_id = test_user["id"]
        setup_payload = {
            "name": "Initial Name",
            "description": "Initial Desc",
            "created_by": user_id,
            "advisor": user_id,
            "instructor": user_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        create_res = await ac.post(f"{self.base_url}/", json=setup_payload)
        project_id = create_res.json()["id"]

        # Update payload
        update_payload = {
            "name": "Updated Name",
            "instructor": user_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        response = await ac.patch(f"{self.base_url}/{project_id}", json=update_payload)
        assert response.status_code == 200
        assert response.json()["name"] == "Updated Name"

    async def test_delete_project(self, ac: AsyncClient, test_user: dict):
        """Tests DELETE /projects/{project_id}."""
        user_id = test_user["id"]
        payload = {
            "name": "To be deleted",
            "description": "...",
            "created_by": user_id,
            "advisor": user_id,
            "instructor": user_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        create_res = await ac.post(f"{self.base_url}/", json=payload)
        project_id = create_res.json()["id"]

        delete_res = await ac.delete(f"{self.base_url}/{project_id}")
        assert delete_res.status_code == 200

        verify_res = await ac.get(f"{self.base_url}/{project_id}")
        assert verify_res.status_code == 404
