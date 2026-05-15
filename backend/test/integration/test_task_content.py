import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestTaskContentEndpoints:
    base_url = "/task_contents"

    async def test_create_task_content(self, ac: AsyncClient, test_user: dict, test_task: dict):
        """Tests POST /task-contents/ — creates a new task content."""
        payload = {
            "task_id": test_task["id"],
            "uploaded_by": test_user["id"],
            "file_name": "test_file.pdf",
            "file_path": "/uploads/test_file.pdf",
            "file_size": 1024,
            "mime_type": "application/pdf",
        }
        response = await ac.post(f"{self.base_url}/", json=payload)
        assert response.status_code == 201, f"Create failed: {response.text}"
        data = response.json()
        assert data["file_name"] == "test_file.pdf"
        assert "id" in data

    async def test_get_all_task_contents(self, ac: AsyncClient, test_user: dict, test_task: dict):
        """Tests GET /task-contents/ — returns a list of task contents."""
        payload = {
            "task_id": test_task["id"],
            "uploaded_by": test_user["id"],
            "file_name": "list_test_file.pdf",
            "file_path": "/uploads/list_test_file.pdf",
            "file_size": 512,
            "mime_type": "application/pdf",
        }
        await ac.post(f"{self.base_url}/", json=payload)

        response = await ac.get(f"{self.base_url}/")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    async def test_get_one_task_content(self, ac: AsyncClient, test_user: dict, test_task: dict):
        """Tests GET /task-contents/{content_id} — fetches a single task content by UUID."""
        payload = {
            "task_id": test_task["id"],
            "uploaded_by": test_user["id"],
            "file_name": "fetch_test_file.pdf",
            "file_path": "/uploads/fetch_test_file.pdf",
            "file_size": 2048,
            "mime_type": "application/pdf",
        }
        create_res = await ac.post(f"{self.base_url}/", json=payload)
        assert create_res.status_code == 201, f"Setup failed: {create_res.text}"
        content_id = create_res.json()["id"]

        response = await ac.get(f"{self.base_url}/{content_id}")
        assert response.status_code == 200
        assert response.json()["id"] == content_id

    async def test_get_one_task_content_not_found(self, ac: AsyncClient):
        """Tests GET /task-contents/{content_id} — returns 404 for non-existent task content."""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await ac.get(f"{self.base_url}/{fake_id}")
        assert response.status_code == 404

    async def test_update_task_content(self, ac: AsyncClient, test_user: dict, test_task: dict):
        """Tests PATCH /task-contents/{content_id} — partially updates a task content."""
        payload = {
            "task_id": test_task["id"],
            "uploaded_by": test_user["id"],
            "file_name": "initial_file.pdf",
            "file_path": "/uploads/initial_file.pdf",
            "file_size": 3072,
            "mime_type": "application/pdf",
        }
        create_res = await ac.post(f"{self.base_url}/", json=payload)
        assert create_res.status_code == 201, f"Setup failed: {create_res.text}"
        content_id = create_res.json()["id"]

        update_payload = {
            "file_name": "updated_file.pdf",
            "file_path": "/uploads/updated_file.pdf",
        }
        response = await ac.patch(f"{self.base_url}/{content_id}", json=update_payload)
        assert response.status_code == 200
        data = response.json()
        assert data["file_name"] == "updated_file.pdf"
        assert data["file_path"] == "/uploads/updated_file.pdf"

    async def test_update_task_content_not_found(self, ac: AsyncClient):
        """Tests PATCH /task-contents/{content_id} — returns 404 for non-existent task content."""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await ac.patch(f"{self.base_url}/{fake_id}", json={"file_name": "ghost.pdf"})
        assert response.status_code == 404

    async def test_delete_task_content(self, ac: AsyncClient, test_user: dict, test_task: dict):
        """Tests DELETE /task-contents/{content_id} — deletes a task content and verifies it's gone."""
        payload = {
            "task_id": test_task["id"],
            "uploaded_by": test_user["id"],
            "file_name": "delete_test_file.pdf",
            "file_path": "/uploads/delete_test_file.pdf",
            "file_size": 4096,
            "mime_type": "application/pdf",
        }
        create_res = await ac.post(f"{self.base_url}/", json=payload)
        assert create_res.status_code == 201, f"Setup failed: {create_res.text}"
        content_id = create_res.json()["id"]

        delete_res = await ac.delete(f"{self.base_url}/{content_id}")
        assert delete_res.status_code == 204

        verify_res = await ac.get(f"{self.base_url}/{content_id}")
        assert verify_res.status_code == 404

    async def test_delete_task_content_not_found(self, ac: AsyncClient):
        """Tests DELETE /task-contents/{content_id} — returns 404 for non-existent task content."""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await ac.delete(f"{self.base_url}/{fake_id}")
        assert response.status_code == 404
