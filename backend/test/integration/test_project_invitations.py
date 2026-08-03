import pytest
from httpx import ASGITransport, AsyncClient
from uuid import UUID, uuid4
from sqlalchemy import select

from app.main import app
from app.core.db import get_async_session
from app.modules.projects.model import Project
from app.modules.users.model import User
from app.modules.users.services import current_active_user


@pytest.mark.asyncio
class TestProjectInvitationEndpoints:
    base_url = "/project_members"
    invitations_url = "/project_members/invitations"

    async def _create_project(self, ac: AsyncClient, user_id: str) -> str:
        """Helper to create a project and return its ID."""
        payload = {
            "name": "Invitation Test Project",
            "description": "Project for invitation tests",
            "created_by": user_id,
            "advisor": user_id,
            "instructor": user_id,
        }
        res = await ac.post("/projects/", json=payload)
        assert res.status_code in [200, 201], f"Project setup failed: {res.text}"
        return res.json()["id"]

    async def _create_target_user(self, ac: AsyncClient) -> dict:
        """Helper to create a target user to invite so the DB is populated."""
        unique_id = uuid4()
        payload = {
            "email": f"invitee_{unique_id}@example.com",
            "password": "Password123!",
            "first_name": "Invitee",
            "last_name": "User",
        }
        # Adjust the route below ("auth/register", "users/signup", etc.) to match your backend
        res = await ac.post("/auth/register", json=payload)
        assert res.status_code in [200, 201], f"Target user creation failed: {res.text}"
        return res.json()

    async def test_get_all_invitations(self, ac: AsyncClient, test_user: dict):
        """Tests GET /project_members/invitations."""
        response = await ac.get(f"{self.invitations_url}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    async def test_create_invitation(self, ac: AsyncClient, test_user: dict):
        """Tests POST /project_members/invitations by setting up dependencies first."""
        user_id = test_user["id"]

        # 1. Seed the project
        project_id = await self._create_project(ac, user_id)

        # 2. Seed the target user in the database
        invitee = await self._create_target_user(ac)
        new_user_email = invitee["email"]

        payload = {
            "project_id": project_id,
            "sender_id": user_id,
            "email": new_user_email,
            "role": "member",
        }

        response = await ac.post(f"{self.invitations_url}", json=payload)

        assert response.status_code == 201, (
            f"Failed to create invitation: {response.text}"
        )
        data = response.json()
        assert data["project_id"] == project_id
        assert data["sender_id"] == user_id
        assert data["email"] == new_user_email
        assert data["role"] == "member"
        assert data["status"] == "pending"
        assert "id" in data

    async def test_get_one_invitation(self, ac: AsyncClient, test_user: dict):
        """Tests GET /project_members/invitations/{invitation_id}."""
        # Dynamically ensure at least one invitation exists
        user_id = test_user["id"]
        project_id = await self._create_project(ac, user_id)
        invitee = await self._create_target_user(ac)

        payload = {
            "project_id": project_id,
            "sender_id": user_id,
            "email": invitee["email"],
            "role": "member",
        }
        await ac.post(f"{self.invitations_url}", json=payload)

        # Get all invitations
        response = await ac.get(f"{self.invitations_url}")
        assert response.status_code == 200
        invitations = response.json()

        invitation_id = invitations[0]["id"]
        response = await ac.get(f"{self.invitations_url}/{invitation_id}")
        assert response.status_code == 200

        data = response.json()
        assert data["id"] == invitation_id
        assert "project_id" in data
        assert "sender_id" in data
        assert "email" in data
        assert "role" in data
        assert "status" in data

    async def test_get_nonexistent_invitation(self, ac: AsyncClient, test_user: dict):
        """Tests GET /project_members/invitations/{invitation_id} with non-existent ID."""
        fake_invitation_id = str(uuid4())
        response = await ac.get(f"{self.invitations_url}/{fake_invitation_id}")
        assert response.status_code == 404

    async def test_update_invitation(self, ac: AsyncClient, test_user: dict):
        """Tests PATCH /project_members/invitations/{invitation_id}."""
        user_id = test_user["id"]
        project_id = await self._create_project(ac, user_id)
        invitee = await self._create_target_user(ac)

        init_payload = {
            "project_id": project_id,
            "sender_id": user_id,
            "email": invitee["email"],
            "role": "member",
        }
        create_res = await ac.post(f"{self.invitations_url}", json=init_payload)
        invitation_id = create_res.json()["id"]

        update_payload = {
            "role": "leader",
            "status": "pending",
        }

        response = await ac.patch(
            f"{self.invitations_url}/{invitation_id}", json=update_payload
        )
        assert response.status_code == 200

        data = response.json()
        assert data["role"] == "leader"
        assert data["id"] == invitation_id

    async def test_update_nonexistent_invitation(
        self, ac: AsyncClient, test_user: dict
    ):
        """Tests PATCH /project_members/invitations/{invitation_id} with non-existent ID."""
        fake_invitation_id = str(uuid4())
        update_payload = {"role": "leader"}

        response = await ac.patch(
            f"{self.invitations_url}/{fake_invitation_id}", json=update_payload
        )
        assert response.status_code == 404

    async def test_accept_invitation(self, ac: AsyncClient, test_user: dict):
        """Tests POST /project_members/invitations/{invitation_id}/accept."""
        user_id = test_user["id"]
        project_id = await self._create_project(ac, user_id)
        invitee = await self._create_target_user(ac)

        init_payload = {
            "project_id": project_id,
            "sender_id": user_id,
            "email": invitee["email"],
            "role": "member",
        }
        create_res = await ac.post(f"{self.invitations_url}", json=init_payload)
        invitation_id = create_res.json()["id"]

        response = await ac.post(f"{self.invitations_url}/{invitation_id}/accept")
        assert response.status_code in [200, 403, 409]

    async def test_accept_invitation_sets_project_advisor(
        self, ac: AsyncClient, db_session, test_user: dict
    ):
        """Accepting an advisor invitation should assign that user to the project advisor field."""
        user_id = test_user["id"]
        project_id = await self._create_project(ac, user_id)
        invitee = await self._create_target_user(ac)
        invitee_id = UUID(invitee["id"])

        init_payload = {
            "project_id": project_id,
            "sender_id": user_id,
            "email": invitee["email"],
            "role": "advisor",
        }
        create_res = await ac.post(f"{self.invitations_url}", json=init_payload)
        invitation_id = create_res.json()["id"]

        async def override_get_async_session():
            yield db_session

        async def override_current_active_user():
            result = await db_session.execute(select(User).where(User.id == invitee_id))
            return result.scalar_one()

        app.dependency_overrides[get_async_session] = override_get_async_session
        app.dependency_overrides[current_active_user] = override_current_active_user

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as invitee_client:
            response = await invitee_client.post(
                f"{self.invitations_url}/{invitation_id}/accept"
            )

        assert response.status_code == 200, response.text

        project = await db_session.get(Project, UUID(project_id))
        assert project is not None
        assert project.advisor == invitee_id

        app.dependency_overrides.clear()

    async def test_accept_nonexistent_invitation(
        self, ac: AsyncClient, test_user: dict
    ):
        """Tests POST /project_members/invitations/{invitation_id}/accept with non-existent ID."""
        fake_invitation_id = str(uuid4())
        response = await ac.post(f"{self.invitations_url}/{fake_invitation_id}/accept")
        assert response.status_code == 404

    async def test_decline_invitation(self, ac: AsyncClient, test_user: dict):
        """Tests POST /project_members/invitations/{invitation_id}/decline."""
        user_id = test_user["id"]
        project_id = await self._create_project(ac, user_id)
        invitee = await self._create_target_user(ac)

        init_payload = {
            "project_id": project_id,
            "sender_id": user_id,
            "email": invitee["email"],
            "role": "member",
        }
        create_res = await ac.post(f"{self.invitations_url}", json=init_payload)
        invitation_id = create_res.json()["id"]

        response = await ac.post(f"{self.invitations_url}/{invitation_id}/decline")
        assert response.status_code in [200, 403, 409]

    async def test_decline_nonexistent_invitation(
        self, ac: AsyncClient, test_user: dict
    ):
        """Tests POST /project_members/invitations/{invitation_id}/decline with non-existent ID."""
        fake_invitation_id = str(uuid4())
        response = await ac.post(f"{self.invitations_url}/{fake_invitation_id}/decline")
        assert response.status_code == 404

    async def test_delete_invitation(self, ac: AsyncClient, test_user: dict):
        """Tests DELETE /project_members/invitations/{invitation_id}."""
        user_id = test_user["id"]
        project_id = await self._create_project(ac, user_id)
        invitee = await self._create_target_user(ac)

        init_payload = {
            "project_id": project_id,
            "sender_id": user_id,
            "email": invitee["email"],
            "role": "member",
        }
        create_res = await ac.post(f"{self.invitations_url}", json=init_payload)
        invitation_id = create_res.json()["id"]

        delete_response = await ac.delete(f"{self.invitations_url}/{invitation_id}")
        assert delete_response.status_code == 204

        verify_response = await ac.get(f"{self.invitations_url}/{invitation_id}")
        assert verify_response.status_code == 404

    async def test_delete_nonexistent_invitation(
        self, ac: AsyncClient, test_user: dict
    ):
        """Tests DELETE /project_members/invitations/{invitation_id} with non-existent ID."""
        fake_invitation_id = str(uuid4())
        response = await ac.delete(f"{self.invitations_url}/{fake_invitation_id}")
        assert response.status_code == 404

    async def test_invitation_response_structure(
        self, ac: AsyncClient, test_user: dict
    ):
        """Tests that invitation responses have the correct structure."""
        response = await ac.get(f"{self.invitations_url}")
        assert response.status_code == 200

        invitations = response.json()
        for invitation in invitations:
            assert "id" in invitation
            assert "project_id" in invitation
            assert "sender_id" in invitation
            assert "email" in invitation
            assert "role" in invitation
            assert "status" in invitation
            assert "created_at" in invitation

    async def test_invitation_status_values(self, ac: AsyncClient, test_user: dict):
        """Tests that invitation status values are valid."""
        response = await ac.get(f"{self.invitations_url}")
        assert response.status_code == 200

        invitations = response.json()
        valid_statuses = ["pending", "accepted", "declined"]
        for invitation in invitations:
            assert invitation["status"] in valid_statuses

    async def test_invitation_role_values(self, ac: AsyncClient, test_user: dict):
        """Tests that invitation role values are valid."""
        response = await ac.get(f"{self.invitations_url}")
        assert response.status_code == 200

        invitations = response.json()
        valid_roles = ["admin", "leader", "member", "none"]
        for invitation in invitations:
            assert invitation["role"] in valid_roles
