import pytest
from httpx import AsyncClient
from uuid import uuid4
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.notifications.services import NotificationService
from app.modules.notifications.model import NotificationType


# ---------------------------------------------------------------------------
# Auth note
# ---------------------------------------------------------------------------
# The `ac` fixture in conftest.py overrides `get_async_session`.
# It must ALSO override `current_active_user` to return the active test_user;
# otherwise every request hits the auth guard and returns 401.
#
# Add this to conftest.py if not already present:
#
#   from app.modules.users.services import current_active_user
#
#   @pytest.fixture
#   async def ac(db_session, test_user_obj):   # test_user_obj = ORM User instance
#       async def override_session():
#           yield db_session
#       async def override_user():
#           return test_user_obj
#       app.dependency_overrides[get_async_session] = override_session
#       app.dependency_overrides[current_active_user] = override_user
#       async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
#           yield client
#       app.dependency_overrides.clear()
# ---------------------------------------------------------------------------


# ---------------------------------------------------------------------------
# Seed helper
# ---------------------------------------------------------------------------


async def _seed_notification(
    db_session: AsyncSession,
    user_id: str,
    *,
    notif_type: NotificationType = NotificationType.GENERAL,
    title: str = "Test Notification",
    body: str = "This is a test notification body.",
    reference_id: str | None = None,
) -> dict:
    """
    Creates a notification directly via the service layer (no POST endpoint exists)
    and returns it as a plain dict so tests can reference its fields.
    """
    from uuid import UUID

    service = NotificationService(db_session)
    notif = await service.create_notification(
        user_id=UUID(user_id),
        notification_type=notif_type,
        title=title,
        body=body,
        reference_id=UUID(reference_id) if reference_id else None,
    )
    await db_session.flush()
    return {
        "id": str(notif.id),
        "user_id": str(notif.user_id),
        "type": notif.type,
        "title": notif.title,
        "body": notif.body,
        "reference_id": str(notif.reference_id) if notif.reference_id else None,
        "is_read": notif.is_read,
        "created_at": str(notif.created_at),
    }


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
class TestNotificationEndpoints:
    """
    End-to-end tests for the /notifications router.

    Routes:
      GET   /notifications/            -> list caller's notifications
      PATCH /notifications/{id}/read  -> mark one notification as read
    """

    BASE = "/notifications"

    # ------------------------------------------------------------------
    # GET /notifications/
    # ------------------------------------------------------------------

    async def test_get_notifications_returns_200(
        self, ac: AsyncClient, test_user: dict
    ):
        """GET /notifications/ returns HTTP 200."""
        response = await ac.get(f"{self.BASE}/")
        assert response.status_code == 200

    async def test_get_notifications_returns_list(
        self, ac: AsyncClient, test_user: dict
    ):
        """Response body is a JSON array."""
        response = await ac.get(f"{self.BASE}/")
        assert isinstance(response.json(), list)

    async def test_get_notifications_empty_for_new_user(
        self, ac: AsyncClient, test_user: dict
    ):
        """A brand-new user has no notifications."""
        response = await ac.get(f"{self.BASE}/")
        assert response.json() == []

    async def test_get_notifications_returns_seeded_item(
        self, ac: AsyncClient, db_session: AsyncSession, test_user: dict
    ):
        """A notification seeded for this user appears in the list."""
        seeded = await _seed_notification(db_session, test_user["id"])

        response = await ac.get(f"{self.BASE}/")

        ids = [n["id"] for n in response.json()]
        assert seeded["id"] in ids

    async def test_get_notifications_response_shape(
        self, ac: AsyncClient, db_session: AsyncSession, test_user: dict
    ):
        """Every item matches the NotificationResponse schema fields."""
        await _seed_notification(db_session, test_user["id"])

        response = await ac.get(f"{self.BASE}/")
        notifications = response.json()
        assert len(notifications) >= 1

        required_keys = {
            "id",
            "user_id",
            "type",
            "title",
            "body",
            "is_read",
            "created_at",
            "reference_id",
        }
        for notif in notifications:
            missing = required_keys - notif.keys()
            assert not missing, f"Response missing keys: {missing}"

    async def test_get_notifications_is_read_defaults_false(
        self, ac: AsyncClient, db_session: AsyncSession, test_user: dict
    ):
        """Freshly created notifications have is_read=False."""
        await _seed_notification(db_session, test_user["id"])

        response = await ac.get(f"{self.BASE}/")
        unread = [n for n in response.json() if not n["is_read"]]
        assert len(unread) >= 1

    async def test_get_notifications_multiple_items(
        self, ac: AsyncClient, db_session: AsyncSession, test_user: dict
    ):
        """All notifications for the user are returned when there are several."""
        for i in range(3):
            await _seed_notification(
                db_session, test_user["id"], title=f"Notification #{i}"
            )

        response = await ac.get(f"{self.BASE}/")
        assert len(response.json()) >= 3

    async def test_get_notifications_excludes_other_users(
        self,
        ac: AsyncClient,
        db_session: AsyncSession,
        test_user: dict,
        test_another_user: dict,
    ):
        """Notifications belonging to another user must not appear in this user's list."""
        await _seed_notification(
            db_session,
            test_another_user["id"],
            title="Other User Notification",
        )

        response = await ac.get(f"{self.BASE}/")

        for notif in response.json():
            assert str(notif["user_id"]) == str(test_user["id"]), (
                "Caller received a notification that belongs to another user."
            )

    # ------------------------------------------------------------------
    # PATCH /notifications/{id}/read
    # ------------------------------------------------------------------

    async def test_mark_read_returns_200(
        self, ac: AsyncClient, db_session: AsyncSession, test_user: dict
    ):
        """PATCH /{id}/read returns HTTP 200."""
        seeded = await _seed_notification(db_session, test_user["id"])
        response = await ac.patch(f"{self.BASE}/{seeded['id']}/read")
        assert response.status_code == 200

    async def test_mark_read_flips_is_read(
        self, ac: AsyncClient, db_session: AsyncSession, test_user: dict
    ):
        """is_read becomes True after PATCH."""
        seeded = await _seed_notification(db_session, test_user["id"])

        response = await ac.patch(f"{self.BASE}/{seeded['id']}/read")

        assert response.json()["is_read"] is True

    async def test_mark_read_response_contains_correct_id(
        self, ac: AsyncClient, db_session: AsyncSession, test_user: dict
    ):
        """Response id matches the patched notification's id."""
        seeded = await _seed_notification(db_session, test_user["id"])

        response = await ac.patch(f"{self.BASE}/{seeded['id']}/read")

        assert response.json()["id"] == seeded["id"]

    async def test_mark_read_response_shape(
        self, ac: AsyncClient, db_session: AsyncSession, test_user: dict
    ):
        """PATCH response conforms to NotificationResponse schema."""
        seeded = await _seed_notification(db_session, test_user["id"])

        response = await ac.patch(f"{self.BASE}/{seeded['id']}/read")

        required_keys = {
            "id",
            "user_id",
            "type",
            "title",
            "body",
            "is_read",
            "created_at",
            "reference_id",
        }
        missing = required_keys - response.json().keys()
        assert not missing, f"Response missing keys: {missing}"

    async def test_mark_read_preserves_other_fields(
        self, ac: AsyncClient, db_session: AsyncSession, test_user: dict
    ):
        """PATCH must not mutate title, body, type, or user_id."""
        seeded = await _seed_notification(
            db_session,
            test_user["id"],
            title="Keep This Title",
            body="Keep This Body",
        )

        data = (await ac.patch(f"{self.BASE}/{seeded['id']}/read")).json()

        assert data["title"] == "Keep This Title"
        assert data["body"] == "Keep This Body"
        assert str(data["user_id"]) == str(test_user["id"])

    async def test_mark_read_is_idempotent(
        self, ac: AsyncClient, db_session: AsyncSession, test_user: dict
    ):
        """Calling PATCH twice on the same notification still returns 200 with is_read=True."""
        seeded = await _seed_notification(db_session, test_user["id"])
        notif_id = seeded["id"]

        first = await ac.patch(f"{self.BASE}/{notif_id}/read")
        second = await ac.patch(f"{self.BASE}/{notif_id}/read")

        assert first.status_code == 200
        assert second.status_code == 200
        assert second.json()["is_read"] is True

    async def test_mark_read_accepts_explicit_true_payload(
        self, ac: AsyncClient, db_session: AsyncSession, test_user: dict
    ):
        """PATCH with explicit body {is_read: true} works correctly."""
        seeded = await _seed_notification(db_session, test_user["id"])

        response = await ac.patch(
            f"{self.BASE}/{seeded['id']}/read",
            json={"is_read": True},
        )

        assert response.status_code == 200
        assert response.json()["is_read"] is True

    async def test_mark_unread_via_payload(
        self, ac: AsyncClient, db_session: AsyncSession, test_user: dict
    ):
        """PATCH with {is_read: false} marks the notification as unread."""
        seeded = await _seed_notification(db_session, test_user["id"])
        notif_id = seeded["id"]

        # First mark as read, then un-read it
        await ac.patch(f"{self.BASE}/{notif_id}/read", json={"is_read": True})
        response = await ac.patch(
            f"{self.BASE}/{notif_id}/read", json={"is_read": False}
        )

        assert response.status_code == 200
        assert response.json()["is_read"] is False

    async def test_mark_read_nonexistent_returns_404(
        self, ac: AsyncClient, test_user: dict
    ):
        """PATCH with a UUID that doesn't exist returns 404."""
        response = await ac.patch(f"{self.BASE}/{uuid4()}/read")
        assert response.status_code == 404

    async def test_mark_read_other_users_notification_returns_404(
        self,
        ac: AsyncClient,
        db_session: AsyncSession,
        test_user: dict,
        test_another_user: dict,
    ):
        """
        A user cannot mark another user's notification as read.
        The service treats it as not found (404) to avoid leaking IDs.
        """
        other_notif = await _seed_notification(
            db_session,
            test_another_user["id"],
            title="Someone Else's Notification",
        )

        # ac is authenticated as test_user, not test_another_user
        response = await ac.patch(f"{self.BASE}/{other_notif['id']}/read")
        assert response.status_code == 404

    async def test_mark_read_invalid_uuid_returns_422(
        self, ac: AsyncClient, test_user: dict
    ):
        """PATCH with a malformed UUID path param returns 422 (FastAPI validation)."""
        response = await ac.patch(f"{self.BASE}/not-a-uuid/read")
        assert response.status_code == 422

    # ------------------------------------------------------------------
    # Cross-endpoint consistency
    # ------------------------------------------------------------------

    async def test_get_reflects_read_status_after_patch(
        self, ac: AsyncClient, db_session: AsyncSession, test_user: dict
    ):
        """After PATCH, the GET list endpoint also shows is_read=True for that item."""
        seeded = await _seed_notification(db_session, test_user["id"])
        notif_id = seeded["id"]

        await ac.patch(f"{self.BASE}/{notif_id}/read")

        notifications = (await ac.get(f"{self.BASE}/")).json()
        matching = [n for n in notifications if n["id"] == notif_id]
        assert len(matching) == 1
        assert matching[0]["is_read"] is True
