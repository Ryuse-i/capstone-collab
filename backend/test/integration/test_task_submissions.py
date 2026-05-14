import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestTaskSubmissionEndpoints:
    base_url = "/task_submissions"

    async def test_create_task_submission(
        self, ac: AsyncClient, test_user: dict, test_task: dict
    ):
        """Tests POST /task_submissions/ — creates a new task submission."""
        payload = {
            "task_id": test_task["id"],
            "result": "pending",
            "comment": "Initial submission",
        }
        response = await ac.post(f"{self.base_url}/", json=payload)
        assert response.status_code == 201, f"Create failed: {response.text}"
        data = response.json()
        assert data["task_id"] == test_task["id"]
        assert data["result"] == "pending"
        assert data["comment"] == "Initial submission"
        assert "id" in data

    async def test_get_all_task_submissions(
        self, ac: AsyncClient, test_user: dict, test_task: dict
    ):
        """Tests GET /task_submissions/ — returns a list of task submissions."""
        payload = {
            "task_id": test_task["id"],
            "result": "accepted",
            "comment": "Good work",
        }
        await ac.post(f"{self.base_url}/", json=payload)

        response = await ac.get(f"{self.base_url}/")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    async def test_get_one_task_submission(
        self, ac: AsyncClient, test_user: dict, test_task: dict
    ):
        """Tests GET /task_submissions/{submission_id} — fetches a single task submission by UUID."""
        payload = {
            "task_id": test_task["id"],
            "result": "revision",
            "comment": "Need revisions",
        }
        create_res = await ac.post(f"{self.base_url}/", json=payload)
        assert create_res.status_code == 201, f"Setup failed: {create_res.text}"
        submission_id = create_res.json()["id"]

        response = await ac.get(f"{self.base_url}/{submission_id}")
        assert response.status_code == 200
        assert response.json()["id"] == submission_id

    async def test_get_one_task_submission_not_found(self, ac: AsyncClient):
        """Tests GET /task_submissions/{submission_id} — returns 404 for non-existent submission."""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await ac.get(f"{self.base_url}/{fake_id}")
        assert response.status_code == 404

    async def test_update_task_submission(
        self, ac: AsyncClient, test_user: dict, test_task: dict
    ):
        """Tests PATCH /task_submissions/{submission_id} — partially updates a task submission."""
        payload = {
            "task_id": test_task["id"],
            "result": "pending",
            "comment": "Original comment",
        }
        create_res = await ac.post(f"{self.base_url}/", json=payload)
        assert create_res.status_code == 201, f"Setup failed: {create_res.text}"
        submission_id = create_res.json()["id"]

        update_payload = {
            "result": "accepted",
            "comment": "Approved!",
        }
        response = await ac.patch(
            f"{self.base_url}/{submission_id}", json=update_payload
        )
        assert response.status_code == 200
        data = response.json()
        assert data["result"] == "accepted"
        assert data["comment"] == "Approved!"

    async def test_update_task_submission_not_found(self, ac: AsyncClient):
        """Tests PATCH /task_submissions/{submission_id} — returns 404 for non-existent submission."""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await ac.patch(
            f"{self.base_url}/{fake_id}", json={"result": "accepted"}
        )
        assert response.status_code == 404

    async def test_delete_task_submission(
        self, ac: AsyncClient, test_user: dict, test_task: dict
    ):
        """Tests DELETE /task_submissions/{submission_id} — deletes a submission and verifies it's gone."""
        payload = {
            "task_id": test_task["id"],
            "result": "pending",
            "comment": "To be deleted",
        }
        create_res = await ac.post(f"{self.base_url}/", json=payload)
        assert create_res.status_code == 201, f"Setup failed: {create_res.text}"
        submission_id = create_res.json()["id"]

        delete_res = await ac.delete(f"{self.base_url}/{submission_id}")
        assert delete_res.status_code == 204

        verify_res = await ac.get(f"{self.base_url}/{submission_id}")
        assert verify_res.status_code == 404

    async def test_delete_task_submission_not_found(self, ac: AsyncClient):
        """Tests DELETE /task_submissions/{submission_id} — returns 404 for non-existent submission."""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await ac.delete(f"{self.base_url}/{fake_id}")
        assert response.status_code == 404
