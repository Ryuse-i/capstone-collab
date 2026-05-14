import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestAssignedMemberEndpoints:
    base_url = "/assigned_members"

    async def test_create_assigned_member(
        self, ac: AsyncClient, test_user: dict, test_task: dict
    ):
        """Tests POST /assigned_members/ — creates a new assigned member."""
        payload = {
            "user_id": test_user["id"],
            "task_id": test_task["id"],
            "role": "leader",
            "effort_share": 50.0,
        }
        response = await ac.post(f"{self.base_url}/", json=payload)
        assert response.status_code == 201, f"Create failed: {response.text}"
        data = response.json()
        assert data["user_id"] == test_user["id"]
        assert data["task_id"] == test_task["id"]
        assert "id" in data

    async def test_get_all_assigned_members(
        self, ac: AsyncClient, test_user: dict, test_task: dict
    ):
        """Tests GET /assigned_members/ — returns a list of assigned members."""
        payload = {
            "user_id": test_user["id"],
            "task_id": test_task["id"],
            "role": "member",
            "effort_share": 30.0,
        }
        await ac.post(f"{self.base_url}/", json=payload)

        response = await ac.get(f"{self.base_url}/")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    async def test_get_one_assigned_member(
        self, ac: AsyncClient, test_user: dict, test_task: dict
    ):
        """Tests GET /assigned_members/{member_id} — fetches a single assigned member by UUID."""
        payload = {
            "user_id": test_user["id"],
            "task_id": test_task["id"],
            "role": "leader",
            "effort_share": 50.0,
        }
        create_res = await ac.post(f"{self.base_url}/", json=payload)
        assert create_res.status_code == 201, f"Setup failed: {create_res.text}"
        member_id = create_res.json()["id"]

        response = await ac.get(f"{self.base_url}/{member_id}")
        assert response.status_code == 200
        assert response.json()["id"] == member_id

    async def test_get_one_assigned_member_not_found(self, ac: AsyncClient):
        """Tests GET /assigned_members/{member_id} — returns 404 for non-existent member."""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await ac.get(f"{self.base_url}/{fake_id}")
        assert response.status_code == 404

    async def test_update_assigned_member(
        self, ac: AsyncClient, test_user: dict, test_task: dict
    ):
        """Tests PATCH /assigned_members/{member_id} — partially updates an assigned member."""
        payload = {
            "user_id": test_user["id"],
            "task_id": test_task["id"],
            "role": "member",
            "effort_share": 25.0,
        }
        create_res = await ac.post(f"{self.base_url}/", json=payload)
        assert create_res.status_code == 201, f"Setup failed: {create_res.text}"
        member_id = create_res.json()["id"]

        update_payload = {
            "role": "leader",
            "effort_share": 60.0,
        }
        response = await ac.patch(f"{self.base_url}/{member_id}", json=update_payload)
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "leader"
        assert data["effort_share"] == 60.0

    async def test_update_assigned_member_not_found(self, ac: AsyncClient):
        """Tests PATCH /assigned_members/{member_id} — returns 404 for non-existent member."""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await ac.patch(
            f"{self.base_url}/{fake_id}", json={"effort_share": 100.0}
        )
        assert response.status_code == 404

    async def test_delete_assigned_member(
        self, ac: AsyncClient, test_user: dict, test_task: dict
    ):
        """Tests DELETE /assigned_members/{member_id} — deletes a member and verifies it's gone."""
        payload = {
            "user_id": test_user["id"],
            "task_id": test_task["id"],
            "role": "member",
            "effort_share": 40.0,
        }
        create_res = await ac.post(f"{self.base_url}/", json=payload)
        assert create_res.status_code == 201, f"Setup failed: {create_res.text}"
        member_id = create_res.json()["id"]

        delete_res = await ac.delete(f"{self.base_url}/{member_id}")
        assert delete_res.status_code == 204

        verify_res = await ac.get(f"{self.base_url}/{member_id}")
        assert verify_res.status_code == 404

    async def test_delete_assigned_member_not_found(self, ac: AsyncClient):
        """Tests DELETE /assigned_members/{member_id} — returns 404 for non-existent member."""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await ac.delete(f"{self.base_url}/{fake_id}")
        assert response.status_code == 404
