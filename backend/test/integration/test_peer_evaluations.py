import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestPeerEvaluationEndpoints:
    base_url = "/peer_evaluations"

    async def test_create_peer_evaluation(self, ac: AsyncClient, test_user: dict, test_another_user: dict, test_task: dict):
        """Tests POST /peer_evaluations/ — creates a new peer evaluation."""
        payload = {
            "evaluator_id": test_user["id"],
            "evaluated_id": test_another_user["id"],
            "task_id": test_task["id"],
            "score": 8,
        }
        response = await ac.post(f"{self.base_url}/", json=payload)
        assert response.status_code == 201, f"Create failed: {response.text}"
        data = response.json()
        assert data["evaluator_id"] == test_user["id"]
        assert data["evaluated_id"] == test_another_user["id"]
        assert data["score"] == 8
        assert "id" in data

    async def test_get_all_peer_evaluations(self, ac: AsyncClient, test_user: dict, test_another_user: dict, test_task: dict):
        """Tests GET /peer_evaluations/ — returns a list of peer evaluations."""
        payload = {
            "evaluator_id": test_user["id"],
            "evaluated_id": test_another_user["id"],
            "task_id": test_task["id"],
            "score": 7,
        }
        await ac.post(f"{self.base_url}/", json=payload)

        response = await ac.get(f"{self.base_url}/")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    async def test_get_one_peer_evaluation(self, ac: AsyncClient, test_user: dict, test_another_user: dict, test_task: dict):
        """Tests GET /peer_evaluations/{evaluation_id} — fetches a single peer evaluation by UUID."""
        payload = {
            "evaluator_id": test_user["id"],
            "evaluated_id": test_another_user["id"],
            "task_id": test_task["id"],
            "score": 9,
        }
        create_res = await ac.post(f"{self.base_url}/", json=payload)
        assert create_res.status_code == 201, f"Setup failed: {create_res.text}"
        evaluation_id = create_res.json()["id"]

        response = await ac.get(f"{self.base_url}/{evaluation_id}")
        assert response.status_code == 200
        assert response.json()["id"] == evaluation_id

    async def test_get_one_peer_evaluation_not_found(self, ac: AsyncClient):
        """Tests GET /peer_evaluations/{evaluation_id} — returns 404 for non-existent evaluation."""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await ac.get(f"{self.base_url}/{fake_id}")
        assert response.status_code == 404

    async def test_update_peer_evaluation(self, ac: AsyncClient, test_user: dict, test_another_user: dict, test_task: dict):
        """Tests PATCH /peer_evaluations/{evaluation_id} — partially updates a peer evaluation."""
        payload = {
            "evaluator_id": test_user["id"],
            "evaluated_id": test_another_user["id"],
            "task_id": test_task["id"],
            "score": 6,
        }
        create_res = await ac.post(f"{self.base_url}/", json=payload)
        assert create_res.status_code == 201, f"Setup failed: {create_res.text}"
        evaluation_id = create_res.json()["id"]

        update_payload = {
            "score": 8,
        }
        response = await ac.patch(f"{self.base_url}/{evaluation_id}", json=update_payload)
        assert response.status_code == 200
        data = response.json()
        assert data["score"] == 8

    async def test_update_peer_evaluation_not_found(self, ac: AsyncClient):
        """Tests PATCH /peer_evaluations/{evaluation_id} — returns 404 for non-existent evaluation."""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await ac.patch(f"{self.base_url}/{fake_id}", json={"score": 5})
        assert response.status_code == 404

    async def test_delete_peer_evaluation(self, ac: AsyncClient, test_user: dict, test_another_user: dict, test_task: dict):
        """Tests DELETE /peer_evaluations/{evaluation_id} — deletes an evaluation and verifies it's gone."""
        payload = {
            "evaluator_id": test_user["id"],
            "evaluated_id": test_another_user["id"],
            "task_id": test_task["id"],
            "score": 7,
        }
        create_res = await ac.post(f"{self.base_url}/", json=payload)
        assert create_res.status_code == 201, f"Setup failed: {create_res.text}"
        evaluation_id = create_res.json()["id"]

        delete_res = await ac.delete(f"{self.base_url}/{evaluation_id}")
        assert delete_res.status_code == 204

        verify_res = await ac.get(f"{self.base_url}/{evaluation_id}")
        assert verify_res.status_code == 404

    async def test_delete_peer_evaluation_not_found(self, ac: AsyncClient):
        """Tests DELETE /peer_evaluations/{evaluation_id} — returns 404 for non-existent evaluation."""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await ac.delete(f"{self.base_url}/{fake_id}")
        assert response.status_code == 404
