import pytest
from httpx import AsyncClient
from uuid import uuid4


@pytest.mark.asyncio
class TestProjectMemberEndpoints:
    base_url = "/project_members"  # adjust to match your router prefix

    async def _create_project(self, ac: AsyncClient, user_id: str) -> str:
        """Helper to create a project and return its ID."""
        payload = {
            "name": "Member Test Project",
            "description": "Project for member tests",
            "created_by": user_id,
            "advisor": user_id,
            "instructor": user_id,
        }
        res = await ac.post("/projects/", json=payload)
        assert res.status_code in [200, 201], f"Project setup failed: {res.text}"
        return res.json()["id"]

    async def test_create_project_member(self, ac: AsyncClient, test_user: dict):
        """Tests POST /project-members/."""
        user_id = test_user["id"]
        project_id = await self._create_project(ac, user_id)

        payload = {
            "id": str(uuid4()),
            "user_id": user_id,
            "project_id": project_id,
            "project_role": "MEMBER",
            "workload_points": 10.0,
            "contribution_points": 5.0,
        }

        response = await ac.post(f"{self.base_url}/", json=payload)
        assert response.status_code in [200, 201], f"Create failed: {response.text}"

        data = response.json()
        assert data["user_id"] == user_id
        assert data["project_id"] == project_id
        assert data["project_role"] == "member"
        assert "id" in data

    async def test_get_one_project_member(self, ac: AsyncClient, test_user: dict):
        """Tests GET /project-members/{member_id}."""
        user_id = test_user["id"]
        project_id = await self._create_project(ac, user_id)

        create_payload = {
            "id": str(uuid4()),
            "user_id": user_id,
            "project_id": project_id,
            "project_role": "MEMBER",
            "workload_points": 10.0,
            "contribution_points": 5.0,
        }
        create_res = await ac.post(f"{self.base_url}/", json=create_payload)
        assert create_res.status_code in [200, 201], f"Setup failed: {create_res.text}"
        member_id = create_res.json()["id"]

        response = await ac.get(f"{self.base_url}/{member_id}")
        assert response.status_code == 200

        data = response.json()
        assert data["id"] == member_id
        assert data["user_id"] == user_id
        assert data["project_id"] == project_id

    async def test_get_all_project_members(self, ac: AsyncClient, test_user: dict):
        """Tests GET /project-members/."""
        user_id = test_user["id"]
        project_id = await self._create_project(ac, user_id)

        # Create two members to ensure list is non-empty
        for _ in range(2):
            payload = {
                "id": str(uuid4()),
                "user_id": user_id,
                "project_id": project_id,
                "project_role": "MEMBER",
                "workload_points": 8.0,
                "contribution_points": 4.0,
            }
            await ac.post(f"{self.base_url}/", json=payload)

        response = await ac.get(f"{self.base_url}/")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        assert len(response.json()) >= 2

    async def test_update_project_member(self, ac: AsyncClient, test_user: dict):
        """Tests PATCH /project-members/{member_id}."""
        user_id = test_user["id"]
        project_id = await self._create_project(ac, user_id)

        create_payload = {
            "id": str(uuid4()),
            "user_id": user_id,
            "project_id": project_id,
            "project_role": "MEMBER",
            "workload_points": 10.0,
            "contribution_points": 5.0,
        }
        create_res = await ac.post(f"{self.base_url}/", json=create_payload)
        assert create_res.status_code in [200, 201], f"Setup failed: {create_res.text}"
        member_id = create_res.json()["id"]

        update_payload = {
            "project_role": "LEADER",
            "workload_points": 20.0,
            "contribution_points": 15.0,
        }
        response = await ac.patch(f"{self.base_url}/{member_id}", json=update_payload)
        assert response.status_code == 200

        data = response.json()
        assert data["project_role"] == "leader"
        assert data["workload_points"] == 20.0
        assert data["contribution_points"] == 15.0

    async def test_delete_project_member(self, ac: AsyncClient, test_user: dict):
        """Tests DELETE /project-members/{member_id}."""
        user_id = test_user["id"]
        project_id = await self._create_project(ac, user_id)

        create_payload = {
            "id": str(uuid4()),
            "user_id": user_id,
            "project_id": project_id,
            "project_role": "MEMBER",
            "workload_points": 10.0,
            "contribution_points": 5.0,
        }
        create_res = await ac.post(f"{self.base_url}/", json=create_payload)
        assert create_res.status_code in [200, 201], f"Setup failed: {create_res.text}"
        member_id = create_res.json()["id"]

        delete_res = await ac.delete(f"{self.base_url}/{member_id}")
        assert delete_res.status_code == 204

        # Verify it's actually gone
        verify_res = await ac.get(f"{self.base_url}/{member_id}")
        assert verify_res.status_code == 404
