import pytest
from httpx import AsyncClient
from datetime import datetime, timezone


@pytest.mark.asyncio
class TestTaskEndpoints:
    base_url = "/tasks"

    async def _task_payload(
        self,
        test_user: dict,
        test_project: dict,
        name: str,
        description: str,
        extra: dict = {},
    ) -> dict:
        """Helper to build a full valid task payload."""
        return {
            "name": name,
            "description": description,
            "created_by": test_user["id"],
            "project_id": test_project["id"],
            "status": "not_started",
            "priority": "low",
            "complexity": "low",
            "complexity_points": 0,
            "category": "development",
            "deadline": "2099-01-01T00:00:00Z",
            **extra,
        }

    async def test_create_task(
        self, ac: AsyncClient, test_user: dict, test_project: dict
    ):
        """Tests POST /tasks/ — creates a new task."""
        payload = await self._task_payload(
            test_user, test_project, "Integration Test Task", "Testing task creation"
        )
        response = await ac.post(f"{self.base_url}/", json=payload)
        assert response.status_code == 201, f"Create failed: {response.text}"
        data = response.json()
        assert data["name"] == "Integration Test Task"
        assert "id" in data

    async def test_get_all_tasks(
        self, ac: AsyncClient, test_user: dict, test_project: dict
    ):
        """Tests GET /tasks/ — returns a list of tasks."""
        payload = await self._task_payload(
            test_user, test_project, "List Test Task", "Should appear in list"
        )
        await ac.post(f"{self.base_url}/", json=payload)

        response = await ac.get(f"{self.base_url}/")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    async def test_get_one_task(
        self, ac: AsyncClient, test_user: dict, test_project: dict
    ):
        """Tests GET /tasks/{task_id} — fetches a single task by UUID."""
        payload = await self._task_payload(
            test_user, test_project, "Fetch Test Task", "Should be fetchable"
        )
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

    async def test_update_task(
        self, ac: AsyncClient, test_user: dict, test_project: dict
    ):
        """Tests PATCH /tasks/{task_id} — partially updates a task."""
        payload = await self._task_payload(
            test_user, test_project, "Initial Task Name", "Initial description"
        )
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

    async def test_delete_task(
        self, ac: AsyncClient, test_user: dict, test_project: dict
    ):
        """Tests DELETE /tasks/{task_id} — deletes a task and verifies it's gone."""
        payload = await self._task_payload(
            test_user,
            test_project,
            "Task To Be Deleted",
            "Should not exist after delete",
        )
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
