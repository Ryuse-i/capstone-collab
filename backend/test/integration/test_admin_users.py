import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.main import app
from app.core.db import get_async_session
from app.modules.admin.repo import AdminUserRepo
from app.modules.admin.activity_model import ActivityLog
from app.modules.files.model import StoredFile
from app.modules.project_members.model import Skills
from app.modules.tasks.enums import Status
from app.modules.tasks.model import Task
from app.modules.users.model import User, UserRole
from app.modules.users.services import current_active_user, require_admin


async def _register_user(client: AsyncClient, *, email: str, password: str = "Password123!", role: str = "student") -> dict:
    """Create a user via the public registration endpoint."""
    payload = {
        "email": email,
        "first_name": "Test",
        "last_name": "User",
        "password": password,
    }
    response = await client.post("/auth/register", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


async def _build_admin_user(db_session, *, email: str | None = None) -> User:
    """Create an admin record in the database and return it."""
    user_email = email or f"admin_{uuid.uuid4().hex[:8]}@example.com"
    user = User(
        email=user_email,
        first_name="Admin",
        last_name="User",
        hashed_password="fakehashedpass",
        role=UserRole.ADMIN,
        is_active=True,
        is_superuser=True,
        is_verified=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.mark.asyncio
class TestAdminUserEndpoints:
    async def test_login_updates_account_health_and_failed_attempt_activity(self, db_session):
        """Signup, successful-login, and rejected-login metrics use recorded events."""
        email = f"health_{uuid.uuid4().hex[:8]}@example.com"

        async def override_get_async_session():
            yield db_session

        app.dependency_overrides[get_async_session] = override_get_async_session

        try:
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                registration = await client.post(
                    "/auth/register",
                    json={
                        "email": email,
                        "first_name": "Health",
                        "last_name": "Check",
                        "password": "Password123!",
                    },
                )
                assert registration.status_code == 201, registration.text
                user = await db_session.scalar(select(User).where(User.email == email))
                assert user is not None
                user.is_verified = True
                await db_session.commit()

                login = await client.post(
                    "/auth/jwt/login",
                    data={"username": email, "password": "Password123!"},
                )
                assert login.status_code == 200, login.text
                await db_session.refresh(user)
                assert user.created_at is not None
                assert user.last_login_at is not None

                failed_login = await client.post(
                    "/auth/jwt/login",
                    data={"username": email, "password": "incorrect"},
                )
                assert failed_login.status_code == 401
                failed_events = await db_session.scalars(
                    select(ActivityLog).where(
                        ActivityLog.event_type == "login_failed",
                        ActivityLog.target_id == user.id,
                    )
                )
                assert failed_events.first() is not None
        finally:
            app.dependency_overrides.clear()

    async def test_admin_metrics_overview_returns_counts_and_audited_activity(self, db_session):
        """The protected overview returns aggregates, system health, and recent audit events."""
        admin = await _build_admin_user(db_session)

        async def override_get_async_session():
            yield db_session

        async def override_current_active_user():
            return admin

        app.dependency_overrides[get_async_session] = override_get_async_session
        app.dependency_overrides[current_active_user] = override_current_active_user

        try:
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                project_response = await client.post(
                    "/projects/",
                    json={
                        "name": "Metrics audit project",
                        "description": "Created for metrics audit coverage",
                        "created_by": str(admin.id),
                    },
                )
                assert project_response.status_code == 201, project_response.text
                project_id = project_response.json()["id"]

                task = Task(
                    name="Metrics audit task",
                    description="Status update audit coverage",
                    created_by=admin.id,
                    project_id=project_id,
                    status=Status.IN_PROGRESS,
                    primary_skill=Skills.BACKEND_DEVELOPMENT,
                    secondary_skills=[],
                )
                db_session.add(task)
                await db_session.commit()
                await db_session.refresh(task)
                task_response = await client.patch(
                    f"/tasks/{task.id}", json={"status": "completed"}
                )
                assert task_response.status_code == 200, task_response.text

                stored_file = StoredFile(
                    key=f"test/{uuid.uuid4().hex}.pdf",
                    filename="metrics-report.pdf",
                    size=2048,
                    content_type="application/pdf",
                    uploaded_by=admin.id,
                )
                db_session.add(stored_file)
                await db_session.commit()

                target = User(
                    email=f"metrics_target_{uuid.uuid4().hex[:8]}@example.com",
                    first_name="Metrics",
                    last_name="Target",
                    hashed_password="not-used-in-this-test",
                    role=UserRole.STUDENT,
                    is_active=True,
                    is_superuser=False,
                    is_verified=True,
                )
                db_session.add(target)
                await db_session.commit()
                await db_session.refresh(target)
                role_response = await client.patch(
                    f"/admin/users/{target.id}", json={"role": "instructor"}
                )
                assert role_response.status_code == 200, role_response.text

                response = await client.get("/admin/metrics/overview")
                assert response.status_code == 200, response.text
                metrics = response.json()
                assert metrics["users"]["total"] >= 1
                assert set(metrics["users"]["by_role"]) == {"admin", "student", "instructor"}
                assert metrics["users"]["new_last_7_days"] >= 0
                assert metrics["users"]["active_last_7_days"] >= 0
                assert metrics["users"]["soft_deleted_total"] >= 0
                assert metrics["projects"]["total"] >= 0
                assert metrics["tasks"]["total"] >= 0
                assert set(metrics["tasks"]["by_status"]) == {
                    "not_started", "in_progress", "submitted", "completed", "unknown"
                }
                assert metrics["activity"]["recent"]
                assert any(item["type"] == "project_created" for item in metrics["activity"]["recent"])
                assert any(item["type"] == "task_completed" for item in metrics["activity"]["recent"])
                assert any(item["action"] == "role_changed" for item in metrics["activity"]["admin_actions"])
                assert metrics["files"]["total"] >= 1
                assert metrics["files"]["total_size_bytes"] >= 2048
                assert any(
                    item["content_type"] == "application/pdf"
                    and item["count"] >= 1
                    and item["total_size_bytes"] >= 2048
                    for item in metrics["files"]["by_type"]
                )
                assert any(item["filename"] == "metrics-report.pdf" for item in metrics["files"]["recent"])
                assert metrics["system"]["api"]["status"] in {"operational", "degraded"}
                assert metrics["system"]["database"]["response_time_ms"] >= 0
                assert metrics["system"]["storage"]["used_bytes"] >= 0
                assert metrics["system"]["storage"]["limit_bytes"] is None
        finally:
            app.dependency_overrides.clear()

    async def test_non_admin_gets_403(self, db_session, test_user):
        """Non-admin users cannot access the admin user list."""

        async def override_get_async_session():
            yield db_session

        async def override_current_active_user():
            result = await db_session.execute(select(User).where(User.id == test_user["id"]))
            return result.scalar_one()

        app.dependency_overrides[get_async_session] = override_get_async_session
        app.dependency_overrides[current_active_user] = override_current_active_user

        try:
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                response = await client.get("/admin/users")
                assert response.status_code == 403, response.text

                metrics_response = await client.get("/admin/metrics/overview")
                assert metrics_response.status_code == 403, metrics_response.text
        finally:
            app.dependency_overrides.clear()

    async def test_admin_can_create_instructor(self, db_session):
        """Admins can create instructor accounts with a temporary password and must-change flag."""
        admin = await _build_admin_user(db_session)

        async def override_get_async_session():
            yield db_session

        async def override_current_active_user():
            return admin

        app.dependency_overrides[get_async_session] = override_get_async_session
        app.dependency_overrides[current_active_user] = override_current_active_user

        try:
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                payload = {
                    "email": f"instructor_{uuid.uuid4().hex[:8]}@example.com",
                    "first_name": "Instructor",
                    "last_name": "User",
                    "password": "TempPass123!",
                    "role": "instructor",
                }
                response = await client.post("/admin/users", json=payload)
                assert response.status_code == 201, response.text
                data = response.json()
                assert data["role"] == "instructor"
                assert data["is_superuser"] is False
                assert data["must_change_password"] is True
        finally:
            app.dependency_overrides.clear()

    async def test_duplicate_email_returns_409(self, db_session):
        """Duplicate email addresses are rejected when admins create accounts."""
        admin = await _build_admin_user(db_session)

        async def override_get_async_session():
            yield db_session

        async def override_current_active_user():
            return admin

        app.dependency_overrides[get_async_session] = override_get_async_session
        app.dependency_overrides[current_active_user] = override_current_active_user

        try:
            email = f"duplicate_{uuid.uuid4().hex[:8]}@example.com"
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                payload = {
                    "email": email,
                    "first_name": "Duplicate",
                    "last_name": "User",
                    "password": "TempPass123!",
                    "role": "instructor",
                }
                first = await client.post("/admin/users", json=payload)
                assert first.status_code == 201, first.text

                second = await client.post("/admin/users", json=payload)
                assert second.status_code == 409, second.text
        finally:
            app.dependency_overrides.clear()

    async def test_self_demotion_is_blocked(self, db_session):
        """Admins cannot demote or otherwise change their own role to a non-admin."""
        admin = await _build_admin_user(db_session)

        async def override_get_async_session():
            yield db_session

        async def override_current_active_user():
            return admin

        app.dependency_overrides[get_async_session] = override_get_async_session
        app.dependency_overrides[current_active_user] = override_current_active_user

        try:
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                response = await client.patch(f"/admin/users/{admin.id}", json={"role": "student"})
                assert response.status_code in (400, 403), response.text
        finally:
            app.dependency_overrides.clear()

    async def test_self_delete_is_blocked(self, db_session):
        """Admins cannot delete their own account."""
        admin = await _build_admin_user(db_session)

        async def override_get_async_session():
            yield db_session

        async def override_current_active_user():
            return admin

        app.dependency_overrides[get_async_session] = override_get_async_session
        app.dependency_overrides[current_active_user] = override_current_active_user

        try:
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                response = await client.delete(f"/admin/users/{admin.id}")
                assert response.status_code in (400, 403), response.text
        finally:
            app.dependency_overrides.clear()

    async def test_last_admin_cannot_be_removed(self, db_session, monkeypatch):
        """The last admin account cannot be deleted from the system."""
        last_admin = await _build_admin_user(db_session)
        actor = User(
            email=f"actor_{uuid.uuid4().hex[:8]}@example.com",
            first_name="Authorized",
            last_name="Actor",
            hashed_password="fakehashedpass",
            role=UserRole.STUDENT,
            is_active=True,
            is_superuser=True,
            is_verified=True,
        )
        db_session.add(actor)
        await db_session.commit()
        await db_session.refresh(actor)

        async def count_one_admin(_repo):
            return 1

        monkeypatch.setattr(AdminUserRepo, "count_admins", count_one_admin)

        async def override_get_async_session():
            yield db_session

        async def override_current_active_user():
            return actor

        app.dependency_overrides[get_async_session] = override_get_async_session
        app.dependency_overrides[current_active_user] = override_current_active_user
        app.dependency_overrides[require_admin] = override_current_active_user

        try:
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                demotion = await client.patch(
                    f"/admin/users/{last_admin.id}", json={"role": "student"}
                )
                assert demotion.status_code == 409, demotion.text

                deactivation = await client.post(f"/admin/users/{last_admin.id}/deactivate")
                assert deactivation.status_code == 409, deactivation.text

                response = await client.delete(f"/admin/users/{last_admin.id}")
                assert response.status_code == 409, response.text
        finally:
            app.dependency_overrides.clear()

    async def test_deactivated_user_cannot_log_in_or_refresh(self, db_session):
        """Inactive users are rejected at login and refresh-time."""
        email = f"inactive_{uuid.uuid4().hex[:8]}@example.com"

        async def override_get_async_session():
            yield db_session

        app.dependency_overrides[get_async_session] = override_get_async_session

        try:
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                registration = await client.post(
                    "/auth/register",
                    json={
                        "email": email,
                        "first_name": "Inactive",
                        "last_name": "User",
                        "password": "Password123!",
                    },
                )
                assert registration.status_code == 201, registration.text
                user = await db_session.scalar(select(User).where(User.email == email))
                assert user is not None
                from app.modules.users.auth import create_refresh_token_for_user

                refresh_token = await create_refresh_token_for_user(str(user.id), db_session)
                user.is_active = False
                await db_session.commit()

                login_payload = {
                    "username": email,
                    "password": "Password123!",
                }
                login_response = await client.post("/auth/jwt/login", data=login_payload)
                assert login_response.status_code == 401, login_response.text

                refresh_response = await client.post("/auth/refresh-token", json={"refresh_token": refresh_token})
                assert refresh_response.status_code == 401, refresh_response.text
        finally:
            app.dependency_overrides.clear()
