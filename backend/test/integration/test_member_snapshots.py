import pytest
import uuid
from httpx import AsyncClient


@pytest.mark.asyncio
class TestMemberSnapshotEndpoints:
    base_url = "/member_snapshots"

    async def _create_project_member(
        self, ac: AsyncClient, test_user: dict, test_project: dict
    ) -> str:
        """Helper to create a project member and return its ID."""
        payload = {
            "id": str(uuid.uuid4()),
            "user_id": test_user["id"],
            "project_id": test_project["id"],
            "project_role": "leader",
            "workload_points": 0.0,
            "contribution_points": 0.0,
        }
        res = await ac.post("/project_members/", json=payload)
        assert res.status_code == 201, f"Project member setup failed: {res.text}"
        return res.json()["id"]

    async def test_create_member_snapshot(
        self, ac: AsyncClient, test_user: dict, test_project: dict
    ):
        """Tests POST /member_snapshots/ — creates a new member snapshot."""
        member_id = await self._create_project_member(ac, test_user, test_project)

        payload = {
            "member_id": member_id,
            "workload_points": "25.50",
            "workload_status": "ok",
        }
        response = await ac.post(f"{self.base_url}/", json=payload)
        assert response.status_code == 201, f"Create failed: {response.text}"
        data = response.json()
        assert data["member_id"] == member_id
        assert float(data["workload_points"]) == 25.50
        assert data["workload_status"] == "ok"
        assert "id" in data
        assert "created_at" in data

    async def test_get_all_member_snapshots(
        self, ac: AsyncClient, test_user: dict, test_project: dict
    ):
        """Tests GET /member_snapshots/ — returns a list of member snapshots."""
        member_id = await self._create_project_member(ac, test_user, test_project)

        payload = {
            "member_id": member_id,
            "workload_points": "10.00",
            "workload_status": "underutilized",
        }
        await ac.post(f"{self.base_url}/", json=payload)

        response = await ac.get(f"{self.base_url}/")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    async def test_get_one_member_snapshot(
        self, ac: AsyncClient, test_user: dict, test_project: dict
    ):
        """Tests GET /member_snapshots/{member_snapshot_id} — fetches a single snapshot by ID."""
        member_id = await self._create_project_member(ac, test_user, test_project)

        payload = {
            "member_id": member_id,
            "workload_points": "15.75",
            "workload_status": "overloaded",
        }
        create_res = await ac.post(f"{self.base_url}/", json=payload)
        assert create_res.status_code == 201, f"Setup failed: {create_res.text}"
        snapshot_id = create_res.json()["id"]

        response = await ac.get(f"{self.base_url}/{snapshot_id}")
        assert response.status_code == 200
        assert response.json()["id"] == snapshot_id
        assert response.json()["member_id"] == member_id

    async def test_get_one_member_snapshot_not_found(self, ac: AsyncClient):
        """Tests GET /member_snapshots/{member_snapshot_id} — returns 404 for non-existent snapshot."""
        response = await ac.get(f"{self.base_url}/999999")
        assert response.status_code == 404

    async def test_update_member_snapshot(
        self, ac: AsyncClient, test_user: dict, test_project: dict
    ):
        """Tests PATCH /member_snapshots/{member_snapshot_id} — partially updates a snapshot."""
        member_id = await self._create_project_member(ac, test_user, test_project)

        payload = {
            "member_id": member_id,
            "workload_points": "20.00",
            "workload_status": "ok",
        }
        create_res = await ac.post(f"{self.base_url}/", json=payload)
        assert create_res.status_code == 201, f"Setup failed: {create_res.text}"
        snapshot_id = create_res.json()["id"]

        update_payload = {
            "workload_points": "45.00",
            "workload_status": "overloaded",
        }
        response = await ac.patch(f"{self.base_url}/{snapshot_id}", json=update_payload)
        assert response.status_code == 200
        data = response.json()
        assert float(data["workload_points"]) == 45.00
        assert data["workload_status"] == "overloaded"

    async def test_update_member_snapshot_not_found(self, ac: AsyncClient):
        """Tests PATCH /member_snapshots/{member_snapshot_id} — returns 404 for non-existent snapshot."""
        response = await ac.patch(
            f"{self.base_url}/999999", json={"workload_points": "99.99"}
        )
        assert response.status_code == 404

    async def test_delete_member_snapshot(
        self, ac: AsyncClient, test_user: dict, test_project: dict
    ):
        """Tests DELETE /member_snapshots/{member_snapshot_id} — deletes a snapshot and verifies it's gone."""
        member_id = await self._create_project_member(ac, test_user, test_project)

        payload = {
            "member_id": member_id,
            "workload_points": "5.00",
            "workload_status": "underutilized",
        }
        create_res = await ac.post(f"{self.base_url}/", json=payload)
        assert create_res.status_code == 201, f"Setup failed: {create_res.text}"
        snapshot_id = create_res.json()["id"]

        delete_res = await ac.delete(f"{self.base_url}/{snapshot_id}")
        assert delete_res.status_code == 204

        verify_res = await ac.get(f"{self.base_url}/{snapshot_id}")
        assert verify_res.status_code == 404

    async def test_delete_member_snapshot_not_found(self, ac: AsyncClient):
        """Tests DELETE /member_snapshots/{member_snapshot_id} — returns 404 for non-existent snapshot."""
        response = await ac.delete(f"{self.base_url}/999999")
        assert response.status_code == 404
