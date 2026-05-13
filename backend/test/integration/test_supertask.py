import pytest
from httpx import AsyncClient
from datetime import datetime, timezone


@pytest.mark.asyncio
class TestSupertaskEndpoints:
    base_url = "/supertasks"

    async def test_create_supertask(
        self, ac: AsyncClient, test_user: dict, test_project: dict
    ):
        payload = {
            "name": "Integration Test Supertask",
            "description": "Testing supertask creation",
            "created_by": test_user["id"],
            "project_id": test_project["id"],
            "deadline": datetime.now(timezone.utc).isoformat(),
        }
        response = await ac.post(f"{self.base_url}/", json=payload)
        assert response.status_code == 201, f"Create failed: {response.text}"
        data = response.json()
        assert data["name"] == "Integration Test Supertask"
        assert "id" in data

    async def test_get_all_supertasks(
        self, ac: AsyncClient, test_user: dict, test_project: dict
    ):
        payload = {
            "name": "List Test Supertask",
            "description": "Should appear in list",
            "created_by": test_user["id"],
            "project_id": test_project["id"],
            "deadline": datetime.now(timezone.utc).isoformat(),
        }
        await ac.post(f"{self.base_url}/", json=payload)

        response = await ac.get(f"{self.base_url}/")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    async def test_get_one_supertask(
        self, ac: AsyncClient, test_user: dict, test_project: dict
    ):
        payload = {
            "name": "Fetch Test Supertask",
            "description": "Should be fetchable",
            "created_by": test_user["id"],
            "project_id": test_project["id"],
            "deadline": datetime.now(timezone.utc).isoformat(),
        }
        create_res = await ac.post(f"{self.base_url}/", json=payload)
        assert create_res.status_code == 201, f"Setup failed: {create_res.text}"
        supertask_id = create_res.json()["id"]

        response = await ac.get(f"{self.base_url}/{supertask_id}")
        assert response.status_code == 200
        assert response.json()["id"] == supertask_id

    async def test_get_one_supertask_not_found(self, ac: AsyncClient):
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await ac.get(f"{self.base_url}/{fake_id}")
        assert response.status_code == 404

    async def test_update_supertask(
        self, ac: AsyncClient, test_user: dict, test_project: dict
    ):
        payload = {
            "name": "Initial Supertask Name",
            "description": "Initial description",
            "created_by": test_user["id"],
            "project_id": test_project["id"],
            "deadline": datetime.now(timezone.utc).isoformat(),
        }
        create_res = await ac.post(f"{self.base_url}/", json=payload)
        assert create_res.status_code == 201, f"Setup failed: {create_res.text}"
        supertask_id = create_res.json()["id"]

        update_payload = {
            "name": "Updated Supertask Name",
            "description": "Updated description",
        }
        response = await ac.patch(
            f"{self.base_url}/{supertask_id}", json=update_payload
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Supertask Name"
        assert data["description"] == "Updated description"

    async def test_update_supertask_not_found(self, ac: AsyncClient):
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await ac.patch(f"{self.base_url}/{fake_id}", json={"name": "Ghost"})
        assert response.status_code == 404

    async def test_delete_supertask(
        self, ac: AsyncClient, test_user: dict, test_project: dict
    ):
        payload = {
            "name": "Supertask To Be Deleted",
            "description": "Should not exist after delete",
            "created_by": test_user["id"],
            "project_id": test_project["id"],
            "deadline": datetime.now(timezone.utc).isoformat(),
        }
        create_res = await ac.post(f"{self.base_url}/", json=payload)
        assert create_res.status_code == 201, f"Setup failed: {create_res.text}"
        supertask_id = create_res.json()["id"]

        delete_res = await ac.delete(f"{self.base_url}/{supertask_id}")
        assert delete_res.status_code == 204

        verify_res = await ac.get(f"{self.base_url}/{supertask_id}")
        assert verify_res.status_code == 404

    async def test_delete_supertask_not_found(self, ac: AsyncClient):
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await ac.delete(f"{self.base_url}/{fake_id}")
        assert response.status_code == 404
