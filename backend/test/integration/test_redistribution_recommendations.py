import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestRedistributionRecommendationEndpoints:
    base_url = "/recommendations"

    async def test_create_recommendation(self, ac: AsyncClient, test_project: dict):
        """Tests POST /redistribution_recommendations/ — creates a new recommendation."""
        payload = {
            "detail": "Consider splitting the workload for better balance",
            "project_id": test_project["id"],
            "suggestion_type": "share",
            "rank": 1,
            "expected_workload_after": "Member A: 50 points, Member B: 40 points",
            "deadline_impact": "No impact on deadline",
        }
        response = await ac.post(f"{self.base_url}/", json=payload)
        assert response.status_code == 201, f"Create failed: {response.text}"
        data = response.json()
        assert data["project_id"] == test_project["id"]
        assert data["suggestion_type"] == "share"
        assert "id" in data

    async def test_get_all_recommendations(self, ac: AsyncClient, test_project: dict):
        """Tests GET /redistribution_recommendations/ — returns a list of recommendations."""
        payload = {
            "detail": "Transfer low-priority task to available member",
            "project_id": test_project["id"],
            "suggestion_type": "transfer",
            "rank": 2,
            "expected_workload_after": "Member A: 60 points, Member C: 30 points",
            "deadline_impact": "Reduces overall timeline by 2 days",
        }
        await ac.post(f"{self.base_url}/", json=payload)

        response = await ac.get(f"{self.base_url}/")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    async def test_get_one_recommendation(self, ac: AsyncClient, test_project: dict):
        """Tests GET /redistribution_recommendations/{recommendation_id} — fetches a single recommendation by ID."""
        payload = {
            "detail": "Rearrange task deadlines to reduce bottleneck",
            "project_id": test_project["id"],
            "suggestion_type": "reschedule",
            "rank": 1,
            "expected_workload_after": "Evenly distributed across sprint",
            "deadline_impact": "Maintains current project deadline",
        }
        create_res = await ac.post(f"{self.base_url}/", json=payload)
        assert create_res.status_code == 201, f"Setup failed: {create_res.text}"
        recommendation_id = create_res.json()["id"]

        response = await ac.get(f"{self.base_url}/{recommendation_id}")
        assert response.status_code == 200
        assert response.json()["id"] == recommendation_id

    async def test_get_one_recommendation_not_found(self, ac: AsyncClient):
        """Tests GET /redistribution_recommendations/{recommendation_id} — returns 404 for non-existent recommendation."""
        fake_id = 0
        response = await ac.get(f"{self.base_url}/{fake_id}")
        assert response.status_code == 404

    async def test_update_recommendation(self, ac: AsyncClient, test_project: dict):
        """Tests PATCH /redistribution_recommendations/{recommendation_id} — partially updates a recommendation."""
        payload = {
            "detail": "Original details",
            "project_id": test_project["id"],
            "suggestion_type": "split",
            "rank": 1,
            "expected_workload_after": "Initial distribution",
            "deadline_impact": "Initial impact",
        }
        create_res = await ac.post(f"{self.base_url}/", json=payload)
        assert create_res.status_code == 201, f"Setup failed: {create_res.text}"
        recommendation_id = create_res.json()["id"]

        update_payload = {
            "detail": "Updated details",
            "rank": 3,
        }
        response = await ac.patch(
            f"{self.base_url}/{recommendation_id}", json=update_payload
        )
        assert response.status_code == 200
        data = response.json()
        assert data["detail"] == "Updated details"
        assert data["rank"] == 3

    async def test_update_recommendation_not_found(self, ac: AsyncClient):
        """Tests PATCH /redistribution_recommendations/{recommendation_id} — returns 404 for non-existent recommendation."""
        fake_id = 0
        response = await ac.patch(
            f"{self.base_url}/{fake_id}",
            json={"detail": "Ghost Recommendation"},
        )
        assert response.status_code == 404

    async def test_delete_recommendation(self, ac: AsyncClient, test_project: dict):
        """Tests DELETE /redistribution_recommendations/{recommendation_id} — deletes a recommendation and verifies it's gone."""
        payload = {
            "detail": "This recommendation will be deleted",
            "project_id": test_project["id"],
            "suggestion_type": "share",
            "rank": 1,
            "expected_workload_after": "Deleted distribution",
            "deadline_impact": "No impact",
        }
        create_res = await ac.post(f"{self.base_url}/", json=payload)
        assert create_res.status_code == 201, f"Setup failed: {create_res.text}"
        recommendation_id = create_res.json()["id"]

        delete_res = await ac.delete(f"{self.base_url}/{recommendation_id}")
        assert delete_res.status_code == 204

        verify_res = await ac.get(f"{self.base_url}/{recommendation_id}")
        assert verify_res.status_code == 404

    async def test_delete_recommendation_not_found(self, ac: AsyncClient):
        """Tests DELETE /redistribution_recommendations/{recommendation_id} — returns 404 for non-existent recommendation."""
        fake_id = 0
        response = await ac.delete(f"{self.base_url}/{fake_id}")
        assert response.status_code == 404
