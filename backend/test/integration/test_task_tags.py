import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestTagEndpoints:
    base_url = "/tags"

    async def test_create_tag(self, ac: AsyncClient):
        """Tests POST /tags/ — creates a new tag."""
        payload = {
            "name": "Backend",
        }
        response = await ac.post(f"{self.base_url}/", json=payload)
        assert response.status_code == 201, f"Create failed: {response.text}"
        data = response.json()
        assert data["name"] == "Backend"
        assert "id" in data

    async def test_get_all_tags(self, ac: AsyncClient):
        """Tests GET /tags/ — returns a list of tags."""
        payload = {
            "name": "Frontend",
        }
        await ac.post(f"{self.base_url}/", json=payload)

        response = await ac.get(f"{self.base_url}/")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    async def test_get_one_tag(self, ac: AsyncClient):
        """Tests GET /tags/{tag_id} — fetches a single tag by UUID."""
        payload = {
            "name": "Database",
        }
        create_res = await ac.post(f"{self.base_url}/", json=payload)
        assert create_res.status_code == 201, f"Setup failed: {create_res.text}"
        tag_id = create_res.json()["id"]

        response = await ac.get(f"{self.base_url}/{tag_id}")
        assert response.status_code == 200
        assert response.json()["id"] == tag_id

    async def test_get_one_tag_not_found(self, ac: AsyncClient):
        """Tests GET /tags/{tag_id} — returns 404 for non-existent tag."""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await ac.get(f"{self.base_url}/{fake_id}")
        assert response.status_code == 404

    async def test_update_tag(self, ac: AsyncClient):
        """Tests PATCH /tags/{tag_id} — partially updates a tag."""
        payload = {
            "name": "Testing",
        }
        create_res = await ac.post(f"{self.base_url}/", json=payload)
        assert create_res.status_code == 201, f"Setup failed: {create_res.text}"
        tag_id = create_res.json()["id"]

        update_payload = {
            "name": "QA",
        }
        response = await ac.patch(f"{self.base_url}/{tag_id}", json=update_payload)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "QA"

    async def test_update_tag_not_found(self, ac: AsyncClient):
        """Tests PATCH /tags/{tag_id} — returns 404 for non-existent tag."""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await ac.patch(f"{self.base_url}/{fake_id}", json={"name": "Ghost"})
        assert response.status_code == 404

    async def test_delete_tag(self, ac: AsyncClient):
        """Tests DELETE /tags/{tag_id} — deletes a tag and verifies it's gone."""
        payload = {
            "name": "Deprecated",
        }
        create_res = await ac.post(f"{self.base_url}/", json=payload)
        assert create_res.status_code == 201, f"Setup failed: {create_res.text}"
        tag_id = create_res.json()["id"]

        delete_res = await ac.delete(f"{self.base_url}/{tag_id}")
        assert delete_res.status_code == 204

        verify_res = await ac.get(f"{self.base_url}/{tag_id}")
        assert verify_res.status_code == 404

    async def test_delete_tag_not_found(self, ac: AsyncClient):
        """Tests DELETE /tags/{tag_id} — returns 404 for non-existent tag."""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await ac.delete(f"{self.base_url}/{fake_id}")
        assert response.status_code == 404


@pytest.mark.asyncio
class TestTaskTagEndpoints:
    base_url = "/task_tags"

    async def _create_tag(self, ac: AsyncClient) -> str:
        """Helper to create a tag."""
        payload = {"name": "Helper Tag"}
        res = await ac.post("/tags/", json=payload)
        return res.json()["id"]

    async def test_create_task_tag(
        self, ac: AsyncClient, test_user: dict, test_task: dict
    ):
        """Tests POST /task_tags/ — creates a new task tag."""
        tag_id = await self._create_tag(ac)

        payload = {
            "task_id": test_task["id"],
            "tag_id": tag_id,
        }
        response = await ac.post(f"{self.base_url}/", json=payload)
        assert response.status_code == 201, f"Create failed: {response.text}"
        data = response.json()
        assert data["task_id"] == test_task["id"]
        assert data["tag_id"] == tag_id
        assert "id" in data

    async def test_get_all_task_tags(
        self, ac: AsyncClient, test_user: dict, test_task: dict
    ):
        """Tests GET /task_tags/ — returns a list of task tags."""
        tag_id = await self._create_tag(ac)

        payload = {
            "task_id": test_task["id"],
            "tag_id": tag_id,
        }
        await ac.post(f"{self.base_url}/", json=payload)

        response = await ac.get(f"{self.base_url}/")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    async def test_get_one_task_tag(
        self, ac: AsyncClient, test_user: dict, test_task: dict
    ):
        """Tests GET /task_tags/{task_tag_id} — fetches a single task tag by ID."""
        tag_id = await self._create_tag(ac)

        payload = {
            "task_id": test_task["id"],
            "tag_id": tag_id,
        }
        create_res = await ac.post(f"{self.base_url}/", json=payload)
        assert create_res.status_code == 201, f"Setup failed: {create_res.text}"
        task_tag_id = create_res.json()["id"]

        response = await ac.get(f"{self.base_url}/{task_tag_id}")
        assert response.status_code == 200
        assert response.json()["id"] == task_tag_id

    async def test_get_one_task_tag_not_found(self, ac: AsyncClient):
        """Tests GET /task_tags/{task_tag_id} — returns 404 for non-existent task tag."""
        fake_id = 99999
        response = await ac.get(f"{self.base_url}/{fake_id}")
        assert response.status_code == 404

    async def test_update_task_tag(
        self, ac: AsyncClient, test_user: dict, test_task: dict
    ):
        """Tests PATCH /task_tags/{task_tag_id} — partially updates a task tag."""
        tag_id = await self._create_tag(ac)
        tag_id_2 = await self._create_tag(ac)

        payload = {
            "task_id": test_task["id"],
            "tag_id": tag_id,
        }
        create_res = await ac.post(f"{self.base_url}/", json=payload)
        assert create_res.status_code == 201, f"Setup failed: {create_res.text}"
        task_tag_id = create_res.json()["id"]

        update_payload = {
            "tag_id": tag_id_2,
        }
        response = await ac.patch(f"{self.base_url}/{task_tag_id}", json=update_payload)
        assert response.status_code == 200
        data = response.json()
        assert data["tag_id"] == tag_id_2

    async def test_update_task_tag_not_found(self, ac: AsyncClient):
        """Tests PATCH /task_tags/{task_tag_id} — returns 404 for non-existent task tag."""
        fake_id = 99999
        response = await ac.patch(
            f"{self.base_url}/{fake_id}",
            json={"tag_id": "00000000-0000-0000-0000-000000000000"},
        )
        assert response.status_code == 404

    async def test_delete_task_tag(
        self, ac: AsyncClient, test_user: dict, test_task: dict
    ):
        """Tests DELETE /task_tags/{task_tag_id} — deletes a task tag and verifies it's gone."""
        tag_id = await self._create_tag(ac)

        payload = {
            "task_id": test_task["id"],
            "tag_id": tag_id,
        }
        create_res = await ac.post(f"{self.base_url}/", json=payload)
        assert create_res.status_code == 201, f"Setup failed: {create_res.text}"
        task_tag_id = create_res.json()["id"]

        delete_res = await ac.delete(f"{self.base_url}/{task_tag_id}")
        assert delete_res.status_code == 204

        verify_res = await ac.get(f"{self.base_url}/{task_tag_id}")
        assert verify_res.status_code == 404

    async def test_delete_task_tag_not_found(self, ac: AsyncClient):
        """Tests DELETE /task_tags/{task_tag_id} — returns 404 for non-existent task tag."""
        fake_id = 99999
        response = await ac.delete(f"{self.base_url}/{fake_id}")
        assert response.status_code == 404
