import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestProjectSnapshotEndpoints:
    base_url = "/project_snapshots"

    async def test_create_project_snapshot(self, ac: AsyncClient, test_project: dict):
        """Tests POST /project_snapshots/ — creates a new project snapshot."""
        payload = {
            "project_id": test_project["id"],
            "total_workload_points": 100,
            "avg_workload": 50,
            "progress_score": "75.00",
            "progress_percentage": 75,
            "expected_score": "80.00",
            "expected_percentage": 80,
            "schedule_variance": "5.00",
            "workload_balance": "10.00",
            "imbalance_severity": "low",
            "health_score": "85.00",
            "health_status": "good",
        }
        response = await ac.post(f"{self.base_url}/", json=payload)
        assert response.status_code == 201, f"Create failed: {response.text}"
        data = response.json()
        assert data["project_id"] == test_project["id"]
        assert data["total_workload_points"] == 100
        assert "id" in data

    async def test_get_one_project_snapshot(self, ac: AsyncClient, test_project: dict):
        """Tests GET /project_snapshots/{project_snapshot_id} — fetches a single project snapshot by ID."""
        payload = {
            "project_id": test_project["id"],
            "total_workload_points": 120,
            "avg_workload": 60,
            "progress_score": "70.00",
            "progress_percentage": 70,
            "expected_score": "85.00",
            "expected_percentage": 85,
            "schedule_variance": "3.00",
            "workload_balance": "8.00",
            "imbalance_severity": "medium",
            "health_score": "80.00",
            "health_status": "warning",
        }
        create_res = await ac.post(f"{self.base_url}/", json=payload)
        assert create_res.status_code == 201, f"Setup failed: {create_res.text}"
        snapshot_id = create_res.json()["id"]

        response = await ac.get(f"{self.base_url}/{snapshot_id}")
        assert response.status_code == 200
        assert response.json()["id"] == snapshot_id

    async def test_get_one_project_snapshot_not_found(self, ac: AsyncClient):
        """Tests GET /project_snapshots/{project_snapshot_id} — returns 404 for non-existent snapshot."""
        response = await ac.get(f"{self.base_url}/999999")
        assert response.status_code == 404

    async def test_update_project_snapshot(self, ac: AsyncClient, test_project: dict):
        """Tests PATCH /project_snapshots/{project_snapshot_id} — partially updates a project snapshot."""
        payload = {
            "project_id": test_project["id"],
            "total_workload_points": 100,
            "avg_workload": 50,
            "progress_score": "75.00",
            "progress_percentage": 75,
            "expected_score": "80.00",
            "expected_percentage": 80,
            "schedule_variance": "5.00",
            "workload_balance": "10.00",
            "imbalance_severity": "low",
            "health_score": "85.00",
            "health_status": "good",
        }
        create_res = await ac.post(f"{self.base_url}/", json=payload)
        assert create_res.status_code == 201, f"Setup failed: {create_res.text}"
        snapshot_id = create_res.json()["id"]

        update_payload = {
            "progress_percentage": 85,
            "progress_score": "85.00",
        }
        response = await ac.patch(f"{self.base_url}/{snapshot_id}", json=update_payload)
        assert response.status_code == 200
        data = response.json()
        assert data["progress_percentage"] == 85

    async def test_update_project_snapshot_not_found(self, ac: AsyncClient):
        """Tests PATCH /project_snapshots/{project_snapshot_id} — returns 404 for non-existent snapshot."""
        response = await ac.patch(
            f"{self.base_url}/999999",
            json={"progress_percentage": 90},
        )
        assert response.status_code == 404
