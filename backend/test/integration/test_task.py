import pytest
from httpx import AsyncClient
from datetime import datetime, timezone


@pytest.mark.asyncio
class TestTaskEndpoints:
    base_url = "/tasks"

    async def test_create_task(self, ac: AsyncClient, test_user: dict):
        """Tests POST /tasks/ — creates a new task."""
        user_id = test_user["id"]
        payload = {
            "name": "Integration Test Task",
            "description": "Testing task creation",
            "created_by": user_id,
            "status": "not_started",
            "complexity": "low",
            "category": "development",
        }
        response = await ac.post(f"{self.base_url}/", json=payload)
        assert response.status_code == 201, f"Create failed: {response.text}"
        data = response.json()
        assert data["name"] == "Integration Test Task"
        assert "id" in data

    async def test_get_all_tasks(self, ac: AsyncClient, test_user: dict):
        """Tests GET /tasks/ — returns a list of tasks."""
        user_id = test_user["id"]
        payload = {
            "name": "List Test Task",
            "description": "Should appear in list",
            "created_by": user_id,
        }
        await ac.post(f"{self.base_url}/", json=payload)

        response = await ac.get(f"{self.base_url}/")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    async def test_get_one_task(self, ac: AsyncClient, test_user: dict):
        """Tests GET /tasks/{task_id} — fetches a single task by UUID."""
        user_id = test_user["id"]
        payload = {
            "name": "Fetch Test Task",
            "description": "Should be fetchable",
            "created_by": user_id,
        }
        create_res = await ac.post(f"{self.base_url}/", json=payload)
        assert create_res.status_code == 201, f"Setup failed: {create_res.text}"
        task_id = create_res.json()["id"]

        response = await ac.get(f"{self.base_url}/{task_id}")
        assert response.status_code == 200
        assert response.json()["id"] == task_id

    async def test_get_one_task_not_found(self, ac: AsyncClient):
        """Tests GET /tasks/{task_id} — returns 404 for non-existent task."""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await ac.get(f"{self.base_url}/{fake_id}")
        assert response.status_code == 404

    async def test_update_task(self, ac: AsyncClient, test_user: dict):
        """Tests PATCH /tasks/{task_id} — partially updates a task."""
        user_id = test_user["id"]
        payload = {
            "name": "Initial Task Name",
            "description": "Initial description",
            "created_by": user_id,
            "status": "not_started",
        }
        create_res = await ac.post(f"{self.base_url}/", json=payload)
        assert create_res.status_code == 201, f"Setup failed: {create_res.text}"
        task_id = create_res.json()["id"]

        update_payload = {
            "name": "Updated Task Name",
            "status": "in_progress",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        response = await ac.patch(f"{self.base_url}/{task_id}", json=update_payload)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Task Name"
        assert data["status"] == "in_progress"

    async def test_update_task_not_found(self, ac: AsyncClient):
        """Tests PATCH /tasks/{task_id} — returns 404 for non-existent task."""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await ac.patch(f"{self.base_url}/{fake_id}", json={"name": "Ghost"})
        assert response.status_code == 404

    async def test_delete_task(self, ac: AsyncClient, test_user: dict):
        """Tests DELETE /tasks/{task_id} — deletes a task and verifies it's gone."""
        user_id = test_user["id"]
        payload = {
            "name": "Task To Be Deleted",
            "description": "Should not exist after delete",
            "created_by": user_id,
        }
        create_res = await ac.post(f"{self.base_url}/", json=payload)
        assert create_res.status_code == 201, f"Setup failed: {create_res.text}"
        task_id = create_res.json()["id"]

        delete_res = await ac.delete(f"{self.base_url}/{task_id}")
        assert delete_res.status_code == 204

        verify_res = await ac.get(f"{self.base_url}/{task_id}")
        assert verify_res.status_code == 404

    async def test_delete_task_not_found(self, ac: AsyncClient):
        """Tests DELETE /tasks/{task_id} — returns 404 for non-existent task."""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await ac.delete(f"{self.base_url}/{fake_id}")
        assert response.status_code == 404
