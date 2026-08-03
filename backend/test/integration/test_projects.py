import pytest
from httpx import AsyncClient
from datetime import datetime, timezone
from uuid import uuid4


@pytest.mark.asyncio
class TestProjectEndpoints:
    base_url = "/projects"
    snapshot_base_url = "/project_snapshots"

    # ==========================================
    # CORE PROJECT ROUTE TESTS
    # ==========================================

    async def test_create_project(self, ac: AsyncClient, test_user: dict):
        """Tests POST /projects/ — creates a project."""
        user_id = test_user["id"]
        payload = {
            "name": "Integration Test Project",
            "description": "Testing with real UUIDs",
            "created_by": user_id,
            "advisor": user_id,
            "instructor": user_id,
        }

        response = await ac.post(f"{self.base_url}/", json=payload)
        assert response.status_code in [200, 201], f"Create failed: {response.text}"

        data = response.json()
        assert data["name"] == "Integration Test Project"
        assert "id" in data

    async def test_get_one_project(self, ac: AsyncClient, test_user: dict):
        """Tests GET /projects/{project_id}."""
        user_id = test_user["id"]
        payload = {
            "name": "Fetch Test",
            "description": "...",
            "created_by": user_id,
            "advisor": user_id,
            "instructor": user_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        create_res = await ac.post(f"{self.base_url}/", json=payload)
        project_id = create_res.json()["id"]

        response = await ac.get(f"{self.base_url}/{project_id}")
        assert response.status_code == 200
        assert response.json()["id"] == project_id

    async def test_update_project(self, ac: AsyncClient, test_user: dict):
        """Tests PATCH /projects/{project_id}."""
        user_id = test_user["id"]
        setup_payload = {
            "name": "Initial Name",
            "description": "Initial Desc",
            "created_by": user_id,
            "advisor": user_id,
            "instructor": user_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        create_res = await ac.post(f"{self.base_url}/", json=setup_payload)
        project_id = create_res.json()["id"]

        # Update payload
        update_payload = {
            "name": "Updated Name",
            "instructor": user_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        response = await ac.patch(f"{self.base_url}/{project_id}", json=update_payload)
        assert response.status_code == 200
        assert response.json()["name"] == "Updated Name"

    async def test_delete_project(self, ac: AsyncClient, test_user: dict):
        """Tests DELETE /projects/{project_id}."""
        user_id = test_user["id"]
        payload = {
            "name": "To be deleted",
            "description": "...",
            "created_by": user_id,
            "advisor": user_id,
            "instructor": user_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        create_res = await ac.post(f"{self.base_url}/", json=payload)
        project_id = create_res.json()["id"]

        delete_res = await ac.delete(f"{self.base_url}/{project_id}")
        assert delete_res.status_code == 204

        verify_res = await ac.get(f"{self.base_url}/{project_id}")
        assert verify_res.status_code == 404

    async def test_get_projects_for_current_user_by_role(
        self, ac: AsyncClient, test_user: dict
    ):
        """Tests GET /projects/me/roles."""
        user_id = test_user["id"]
        await ac.post(
            f"{self.base_url}/",
            json={
                "name": "Instructor Project",
                "description": "Instructor role",
                "created_by": user_id,
                "instructor": user_id,
            },
        )
        await ac.post(
            f"{self.base_url}/",
            json={
                "name": "Advisor Project",
                "description": "Advisor role",
                "created_by": user_id,
                "advisor": user_id,
            },
        )

        response = await ac.get(f"{self.base_url}/me/roles")
        assert response.status_code == 200
        assert any(project["name"] == "Instructor Project" for project in response.json()["instructor_projects"])
        assert any(project["name"] == "Advisor Project" for project in response.json()["advisor_projects"])

    # ==========================================
    # USER-CENTRIC PROJECT ROUTE TESTS
    # ==========================================

    async def test_get_user_project(self, ac: AsyncClient, test_user: dict):
        """Tests GET /projects/user/{user_id}."""
        user_id = test_user["id"]
        payload = {
            "name": "User Specific Project",
            "description": "Belongs to test user",
            "created_by": user_id,
            "advisor": user_id,
            "instructor": user_id,
        }
        await ac.post(f"{self.base_url}/", json=payload)

        response = await ac.get(f"{self.base_url}/user/{user_id}")
        assert response.status_code == 200
        assert response.json()["name"] == "User Specific Project"

    async def test_get_user_project_not_found(self, ac: AsyncClient):
        """Tests GET /projects/user/{user_id} — 404 handler."""
        random_uuid = str(uuid4())
        response = await ac.get(f"{self.base_url}/user/{random_uuid}")
        assert response.status_code == 404
        assert response.json()["detail"] == "No project found for this user."

    async def test_get_user_project_with_snapshot(
        self, ac: AsyncClient, test_user: dict
    ):
        """Tests GET /projects/user/{user_id}/with-snapshot."""
        user_id = test_user["id"]

        # 1. Create the project
        project_payload = {
            "name": "Snapshot Project",
            "description": "Project featuring snapshot data",
            "created_by": user_id,
            "advisor": user_id,
            "instructor": user_id,
        }
        project_res = await ac.post(f"{self.base_url}/", json=project_payload)
        project_id = project_res.json()["id"]

        # 2. Populate its snapshot dependency
        snapshot_payload = {
            "project_id": project_id,
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
        await ac.post(f"{self.snapshot_base_url}/", json=snapshot_payload)

        # 3. Request combined payload
        response = await ac.get(f"{self.base_url}/user/{user_id}/with-snapshot")
        assert response.status_code == 200
        assert response.json()["name"] == "Snapshot Project"

    async def test_get_user_project_with_snapshot_not_found(self, ac: AsyncClient):
        """Tests GET /projects/user/{user_id}/with-snapshot — 404 handler."""
        random_uuid = str(uuid4())
        response = await ac.get(f"{self.base_url}/user/{random_uuid}/with-snapshot")
        assert response.status_code == 404
        assert response.json()["detail"] == "No project found for this user."


@pytest.mark.asyncio
class TestProjectSnapshotEndpoints:
    base_url = "/project_snapshots"

    # ==========================================
    # SNAPSHOT ROUTE TESTS
    # ==========================================

    async def test_create_project_snapshot(self, ac: AsyncClient, test_project: dict):
        """Tests POST /project_snapshots/ — creates a new snapshot."""
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
        """Tests GET /project_snapshots/{project_snapshot_id}."""
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
        """Tests GET /project_snapshots/{project_snapshot_id} — 404 handler."""
        response = await ac.get(f"{self.base_url}/999999")
        assert response.status_code == 404

    async def test_update_project_snapshot(self, ac: AsyncClient, test_project: dict):
        """Tests PATCH /project_snapshots/{project_snapshot_id}."""
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
        assert response.json()["progress_percentage"] == 85

    async def test_update_project_snapshot_not_found(self, ac: AsyncClient):
        """Tests PATCH /project_snapshots/{project_snapshot_id} — 404 handler."""
        response = await ac.patch(
            f"{self.base_url}/999999",
            json={"progress_percentage": 90},
        )
        assert response.status_code == 404
