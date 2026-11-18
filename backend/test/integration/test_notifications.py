from uuid import UUID

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.notifications.model import NotificationType
from app.modules.notifications.schema import CreateNotification
from app.modules.notifications.services import NotificationService
from app.modules.admin.activity_service import ActivityLogService
from app.modules.member_activities.model import ActivityType
from app.modules.member_activities.services import MemberActivityService
from app.modules.project_members.model import ProjectMember, ProjectRole
from app.modules.projects.model import Project
from app.modules.users.model import User, UserRole


async def _seed_notification(
    db_session: AsyncSession,
    user_id: str,
    *,
    is_read: bool = False,
) -> str:
    notification = await NotificationService.create_notification(
        db_session,
        CreateNotification(
            user_id=UUID(user_id),
            title="Task update",
            body="A task was submitted.",
            type=NotificationType.GENERAL,
        ),
    )
    if is_read:
        notification.is_read = True
        await db_session.flush()
    return str(notification.id)


@pytest.mark.asyncio
async def test_notifications_are_scoped_to_authenticated_user(
    ac: AsyncClient,
    db_session: AsyncSession,
    test_user: dict,
    test_another_user: dict,
):
    own_id = await _seed_notification(db_session, test_user["id"])
    await _seed_notification(db_session, test_another_user["id"])

    response = await ac.get("/notifications/")

    assert response.status_code == 200
    assert [item["id"] for item in response.json()] == [own_id]


@pytest.mark.asyncio
async def test_notification_can_be_marked_read_and_unread(
    ac: AsyncClient,
    db_session: AsyncSession,
    test_user: dict,
):
    notification_id = await _seed_notification(db_session, test_user["id"])

    read_response = await ac.patch(
        f"/notifications/mark_as_read/{notification_id}"
    )
    unread_response = await ac.patch(
        f"/notifications/mark_as_unread/{notification_id}"
    )

    assert read_response.status_code == 200
    assert read_response.json()["is_read"] is True
    assert unread_response.status_code == 200
    assert unread_response.json()["is_read"] is False


@pytest.mark.asyncio
async def test_only_read_notifications_can_be_cleared(
    ac: AsyncClient,
    db_session: AsyncSession,
    test_user: dict,
):
    unread_id = await _seed_notification(db_session, test_user["id"])
    read_id = await _seed_notification(
        db_session, test_user["id"], is_read=True
    )

    unread_response = await ac.delete(f"/notifications/{unread_id}")
    read_response = await ac.delete(f"/notifications/{read_id}")

    assert unread_response.status_code == 409
    assert read_response.status_code == 204
    remaining = await ac.get("/notifications/")
    assert [item["id"] for item in remaining.json()] == [unread_id]


@pytest.mark.asyncio
async def test_users_cannot_change_or_clear_another_users_notification(
    ac: AsyncClient,
    db_session: AsyncSession,
    test_another_user: dict,
):
    notification_id = await _seed_notification(
        db_session, test_another_user["id"], is_read=True
    )

    mark_response = await ac.patch(
        f"/notifications/mark_as_read/{notification_id}"
    )
    clear_response = await ac.delete(f"/notifications/{notification_id}")

    assert mark_response.status_code == 404
    assert clear_response.status_code == 404


@pytest.mark.asyncio
async def test_project_role_notifications_reach_only_selected_roles(
    db_session: AsyncSession,
    test_user: dict,
    test_another_user: dict,
):
    leader_id = UUID(test_user["id"])
    advisor_id = UUID(test_another_user["id"])
    project = Project(
        name="Notification roles",
        description="Role routing test",
        created_by=leader_id,
        advisor=advisor_id,
    )
    db_session.add(project)
    await db_session.flush()
    db_session.add_all(
        [
            ProjectMember(
                user_id=leader_id,
                project_id=project.id,
                project_role=ProjectRole.LEADER,
            ),
            ProjectMember(
                user_id=advisor_id,
                project_id=project.id,
                project_role=ProjectRole.MEMBER,
            ),
        ]
    )
    await db_session.flush()

    await NotificationService.notify_project_roles(
        db_session,
        project.id,
        {ProjectRole.ADVISOR},
        actor_id=None,
        title="Task submitted",
        body="A task was submitted.",
    )
    notifications = await NotificationService.get_all_notifications(
        db_session, advisor_id
    )
    leader_notifications = await NotificationService.get_all_notifications(
        db_session, leader_id
    )

    assert len(notifications) == 1
    assert notifications[0].title == "Task submitted"
    assert leader_notifications == []


@pytest.mark.asyncio
async def test_member_activity_notifies_project_leader_and_instructor_once(
    db_session: AsyncSession,
    test_user: dict,
    test_another_user: dict,
):
    actor_id = UUID(test_user["id"])
    leader_and_instructor_id = UUID(test_another_user["id"])
    project = Project(
        name="Member activity notifications",
        description="Leader and instructor routing test",
        created_by=leader_and_instructor_id,
        instructor=leader_and_instructor_id,
    )
    db_session.add(project)
    await db_session.flush()
    db_session.add(
        ProjectMember(
            user_id=actor_id,
            project_id=project.id,
            project_role=ProjectRole.MEMBER,
        )
    )
    await db_session.flush()

    recorded = await MemberActivityService.log(
        db_session,
        project_id=project.id,
        user_id=actor_id,
        type=ActivityType.TASK_CREATED,
        message='Created task "Research"',
        commit=False,
    )

    recipient_notifications = await NotificationService.get_all_notifications(
        db_session, leader_and_instructor_id
    )
    actor_notifications = await NotificationService.get_all_notifications(
        db_session, actor_id
    )

    assert recorded is True
    assert len(recipient_notifications) == 1
    assert recipient_notifications[0].body == 'Created task "Research"'
    assert actor_notifications == []


@pytest.mark.asyncio
async def test_user_activity_notifies_active_admins_not_the_actor(
    db_session: AsyncSession,
    test_user: dict,
    test_another_user: dict,
):
    actor_id = UUID(test_user["id"])
    admin_id = UUID(test_another_user["id"])
    admin = await db_session.get(User, admin_id)
    admin.role = UserRole.ADMIN
    await db_session.flush()

    await ActivityLogService.record(
        db_session,
        event_type="profile_updated",
        actor_id=actor_id,
        target_type="user",
        target_id=actor_id,
        details={"target_label": "Test User"},
    )

    admin_notifications = await NotificationService.get_all_notifications(
        db_session, admin_id
    )
    actor_notifications = await NotificationService.get_all_notifications(
        db_session, actor_id
    )

    assert len(admin_notifications) == 1
    assert admin_notifications[0].title == "User activity"
    assert admin_notifications[0].body == "Profile updated: Test User"
    assert actor_notifications == []
