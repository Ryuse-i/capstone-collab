import pytest
from httpx import AsyncClient
from uuid import UUID


@pytest.mark.asyncio
class TestTaskCommentEndpoints:
    base_url = "/task_comments"

    async def test_create_task_comment(self, ac: AsyncClient, test_user: dict, test_task: dict):
        """Tests POST /task_comments/ — creates a new task comment."""
        payload = {
            "task_id": test_task["id"],
            "author_id": test_user["id"],
            "content": "This is a test comment",
        }
        response = await ac.post(f"{self.base_url}/", json=payload)
        assert response.status_code == 201, f"Create failed: {response.text}"
        data = response.json()
        assert data["task_id"] == test_task["id"]
        assert data["author_id"] == test_user["id"]
        assert data["content"] == "This is a test comment"
        assert "id" in data
        # Verify that the id is a valid UUID
        UUID(data["id"])

    async def test_get_all_task_comments(self, ac: AsyncClient, test_user: dict, test_task: dict):
        """Tests GET /task_comments/ — returns a list of task comments."""
        payload = {
            "task_id": test_task["id"],
            "author_id": test_user["id"],
            "content": "Another test comment",
        }
        await ac.post(f"{self.base_url}/", json=payload)

        response = await ac.get(f"{self.base_url}/")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        if len(response.json()) > 0:
            # Verify that the first item's id is a valid UUID
            UUID(response.json()[0]["id"])

    async def test_get_one_task_comment(self, ac: AsyncClient, test_user: dict, test_task: dict):
        """Tests GET /task_comments/{comment_id} — fetches a single task comment by ID."""
        payload = {
            "task_id": test_task["id"],
            "author_id": test_user["id"],
            "content": "Fetch test comment",
        }
        create_res = await ac.post(f"{self.base_url}/", json=payload)
        assert create_res.status_code == 201, f"Setup failed: {create_res.text}"
        comment_id = create_res.json()["id"]
        # Verify that the comment_id is a valid UUID
        UUID(comment_id)

        response = await ac.get(f"{self.base_url}/{comment_id}")
        assert response.status_code == 200
        assert response.json()["id"] == comment_id

    async def test_get_one_task_comment_not_found(self, ac: AsyncClient):
        """Tests GET /task_comments/{comment_id} — returns 404 for non-existent comment."""
        fake_id = "00000000-0000-0000-0000-000000000000"  # Valid UUID format but non-existent
        response = await ac.get(f"{self.base_url}/{fake_id}")
        assert response.status_code == 404

    async def test_update_task_comment(self, ac: AsyncClient, test_user: dict, test_task: dict):
        """Tests PATCH /task_comments/{comment_id} — partially updates a task comment."""
        payload = {
            "task_id": test_task["id"],
            "author_id": test_user["id"],
            "content": "Original comment",
        }
        create_res = await ac.post(f"{self.base_url}/", json=payload)
        assert create_res.status_code == 201, f"Setup failed: {create_res.text}"
        comment_id = create_res.json()["id"]
        # Verify that the comment_id is a valid UUID
        UUID(comment_id)

        update_payload = {
            "content": "Updated comment content",
        }
        response = await ac.patch(f"{self.base_url}/{comment_id}", json=update_payload)
        assert response.status_code == 200
        data = response.json()
        assert data["content"] == "Updated comment content"

    async def test_update_task_comment_not_found(self, ac: AsyncClient):
        """Tests PATCH /task_comments/{comment_id} — returns 404 for non-existent comment."""
        fake_id = "00000000-0000-0000-0000-000000000000"  # Valid UUID format but non-existent
        response = await ac.patch(f"{self.base_url}/{fake_id}", json={"content": "Ghost comment"})
        assert response.status_code == 404

    async def test_delete_task_comment(self, ac: AsyncClient, test_user: dict, test_task: dict):
        """Tests DELETE /task_comments/{comment_id} — deletes a comment and verifies it's gone."""
        payload = {
            "task_id": test_task["id"],
            "author_id": test_user["id"],
            "content": "Comment to delete",
        }
        create_res = await ac.post(f"{self.base_url}/", json=payload)
        assert create_res.status_code == 201, f"Setup failed: {create_res.text}"
        comment_id = create_res.json()["id"]
        # Verify that the comment_id is a valid UUID
        UUID(comment_id)

        delete_res = await ac.delete(f"{self.base_url}/{comment_id}")
        assert delete_res.status_code == 204

        verify_res = await ac.get(f"{self.base_url}/{comment_id}")
        assert verify_res.status_code == 404

    async def test_delete_task_comment_not_found(self, ac: AsyncClient):
        """Tests DELETE /task_comments/{comment_id} — returns 404 for non-existent comment."""
        fake_id = "00000000-0000-0000-0000-000000000000"  # Valid UUID format but non-existent
        response = await ac.delete(f"{self.base_url}/{fake_id}")
        assert response.status_code == 404
