import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestMemberActivityEndpoints:
    base_url = "/member_activities"

    async def test_create_member_activity(
        self, ac: AsyncClient, test_project_member: dict
    ):
        """Tests POST /member_activities/ — creates a new member activity."""
        payload = {
            "member_id": test_project_member["id"],
            "detail": "Attended sprint planning meeting",
        }
        response = await ac.post(f"{self.base_url}/", json=payload)
        assert response.status_code == 201, f"Create failed: {response.text}"
        data = response.json()
        assert data["member_id"] == test_project_member["id"]
        assert data["detail"] == "Attended sprint planning meeting"
        assert "id" in data
        assert "created_at" in data

    async def test_get_all_member_activities(
        self, ac: AsyncClient, test_project_member: dict
    ):
        """Tests GET /member_activities/ — returns a list of member activities."""
        payload = {
            "member_id": test_project_member["id"],
            "detail": "Completed code review",
        }
        await ac.post(f"{self.base_url}/", json=payload)

        response = await ac.get(f"{self.base_url}/")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    async def test_get_one_member_activity(
        self, ac: AsyncClient, test_project_member: dict
    ):
        """Tests GET /member_activities/{member_activity_id} — fetches a single member activity by ID."""
        payload = {
            "member_id": test_project_member["id"],
            "detail": "Submitted pull request",
        }
        create_res = await ac.post(f"{self.base_url}/", json=payload)
        assert create_res.status_code == 201, f"Setup failed: {create_res.text}"
        activity_id = create_res.json()["id"]

        response = await ac.get(f"{self.base_url}/{activity_id}")
        assert response.status_code == 200
        assert response.json()["id"] == activity_id

    async def test_get_one_member_activity_not_found(self, ac: AsyncClient):
        """Tests GET /member_activities/{member_activity_id} — returns 404 for non-existent activity."""
        response = await ac.get(f"{self.base_url}/999999")
        assert response.status_code == 404

    async def test_update_member_activity(
        self, ac: AsyncClient, test_project_member: dict
    ):
        """Tests PATCH /member_activities/{member_activity_id} — partially updates a member activity."""
        payload = {
            "member_id": test_project_member["id"],
            "detail": "Original activity",
        }
        create_res = await ac.post(f"{self.base_url}/", json=payload)
        assert create_res.status_code == 201, f"Setup failed: {create_res.text}"
        activity_id = create_res.json()["id"]

        update_payload = {
            "detail": "Updated activity details",
        }
        response = await ac.patch(f"{self.base_url}/{activity_id}", json=update_payload)
        assert response.status_code == 200
        data = response.json()
        assert data["detail"] == "Updated activity details"

    async def test_update_member_activity_not_found(self, ac: AsyncClient):
        """Tests PATCH /member_activities/{member_activity_id} — returns 404 for non-existent activity."""
        response = await ac.patch(
            f"{self.base_url}/999999", json={"detail": "Ghost activity"}
        )
        assert response.status_code == 404

    async def test_delete_member_activity(
        self, ac: AsyncClient, test_project_member: dict
    ):
        """Tests DELETE /member_activities/{member_activity_id} — deletes an activity and verifies it's gone."""
        payload = {
            "member_id": test_project_member["id"],
            "detail": "Activity to delete",
        }
        create_res = await ac.post(f"{self.base_url}/", json=payload)
        assert create_res.status_code == 201, f"Setup failed: {create_res.text}"
        activity_id = create_res.json()["id"]

        delete_res = await ac.delete(f"{self.base_url}/{activity_id}")
        assert delete_res.status_code == 204

        verify_res = await ac.get(f"{self.base_url}/{activity_id}")
        assert verify_res.status_code == 404

    async def test_delete_member_activity_not_found(self, ac: AsyncClient):
        """Tests DELETE /member_activities/{member_activity_id} — returns 404 for non-existent activity."""
        response = await ac.delete(f"{self.base_url}/999999")
        assert response.status_code == 404
