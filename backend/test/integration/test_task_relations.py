import pytest
from httpx import AsyncClient


TASK_PAYLOAD_DEFAULTS = {
    "status": "not_started",
    "priority": "low",
    "complexity": "low",
    "complexity_points": 0,
    "category": "development",
    "deadline": "2099-01-01T00:00:00Z",
}


@pytest.mark.asyncio
class TestTaskRelationEndpoints:
    base_url = "/task_relations"

    async def _create_task(self, ac: AsyncClient, test_user: dict, test_project: dict, name: str, description: str) -> str:
        """Helper to create a task with all required fields."""
        payload = {
            "name": name,
            "description": description,
            "created_by": test_user["id"],
            "project_id": test_project["id"],
            **TASK_PAYLOAD_DEFAULTS,
        }
        res = await ac.post("/tasks/", json=payload)
        assert res.status_code == 201, f"Task creation failed: {res.text}"
        return res.json()["id"]

    async def test_create_task_relation(
        self, ac: AsyncClient, test_user: dict, test_task: dict, test_project: dict
    ):
        """Tests POST /task_relations/ — creates a new task relation."""
        related_task_id = await self._create_task(ac, test_user, test_project, "Related Task", "Task to relate to")

        payload = {
            "task_id": test_task["id"],
            "related_to": related_task_id,
            "relation": "blocks",
        }
        response = await ac.post(f"{self.base_url}/", json=payload)
        assert response.status_code == 201, f"Create failed: {response.text}"
        data = response.json()
        assert data["task_id"] == test_task["id"]
        assert data["related_to"] == related_task_id
        assert data["relation"] == "blocks"
        assert "id" in data

    async def test_get_all_task_relations(
        self, ac: AsyncClient, test_user: dict, test_task: dict, test_project: dict
    ):
        """Tests GET /task_relations/ — returns a list of task relations."""
        related_task_id = await self._create_task(ac, test_user, test_project, "Another Task", "For relation list")

        payload = {
            "task_id": test_task["id"],
            "related_to": related_task_id,
            "relation": "related",
        }
        await ac.post(f"{self.base_url}/", json=payload)

        response = await ac.get(f"{self.base_url}/")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    async def test_get_one_task_relation(
        self, ac: AsyncClient, test_user: dict, test_task: dict, test_project: dict
    ):
        """Tests GET /task_relations/{relation_id} — fetches a single task relation by ID."""
        related_task_id = await self._create_task(ac, test_user, test_project, "Task for Fetch", "Task to fetch relation")

        payload = {
            "task_id": test_task["id"],
            "related_to": related_task_id,
            "relation": "blocked_by",
        }
        create_res = await ac.post(f"{self.base_url}/", json=payload)
        assert create_res.status_code == 201, f"Setup failed: {create_res.text}"
        relation_id = create_res.json()["id"]

        response = await ac.get(f"{self.base_url}/{relation_id}")
        assert response.status_code == 200
        assert response.json()["id"] == relation_id

    async def test_get_one_task_relation_not_found(self, ac: AsyncClient):
        """Tests GET /task_relations/{relation_id} — returns 404 for non-existent relation."""
        response = await ac.get(f"{self.base_url}/99999")
        assert response.status_code == 404

    async def test_update_task_relation(
        self, ac: AsyncClient, test_user: dict, test_task: dict, test_project: dict
    ):
        """Tests PATCH /task_relations/{relation_id} — partially updates a task relation."""
        related_task_id = await self._create_task(ac, test_user, test_project, "Update Test Task", "For update test")

        payload = {
            "task_id": test_task["id"],
            "related_to": related_task_id,
            "relation": "related",
        }
        create_res = await ac.post(f"{self.base_url}/", json=payload)
        assert create_res.status_code == 201, f"Setup failed: {create_res.text}"
        relation_id = create_res.json()["id"]

        response = await ac.patch(f"{self.base_url}/{relation_id}", json={"relation": "blocks"})
        assert response.status_code == 200
        assert response.json()["relation"] == "blocks"

    async def test_update_task_relation_not_found(self, ac: AsyncClient):
        """Tests PATCH /task_relations/{relation_id} — returns 404 for non-existent relation."""
        response = await ac.patch(f"{self.base_url}/99999", json={"relation": "blocks"})
        assert response.status_code == 404

    async def test_delete_task_relation(
        self, ac: AsyncClient, test_user: dict, test_task: dict, test_project: dict
    ):
        """Tests DELETE /task_relations/{relation_id} — deletes a relation and verifies it's gone."""
        related_task_id = await self._create_task(ac, test_user, test_project, "Delete Test Task", "For delete test")

        payload = {
            "task_id": test_task["id"],
            "related_to": related_task_id,
            "relation": "related",
        }
        create_res = await ac.post(f"{self.base_url}/", json=payload)
        assert create_res.status_code == 201, f"Setup failed: {create_res.text}"
        relation_id = create_res.json()["id"]

        delete_res = await ac.delete(f"{self.base_url}/{relation_id}")
        assert delete_res.status_code == 204

        verify_res = await ac.get(f"{self.base_url}/{relation_id}")
        assert verify_res.status_code == 404

    async def test_delete_task_relation_not_found(self, ac: AsyncClient):
        """Tests DELETE /task_relations/{relation_id} — returns 404 for non-existent relation."""
        response = await ac.delete(f"{self.base_url}/99999")
        assert response.status_code == 404
