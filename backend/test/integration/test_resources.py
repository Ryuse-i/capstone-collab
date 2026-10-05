import pytest

from app.main import app
from app.modules.users.model import User
from app.modules.users.services import current_active_user


@pytest.mark.asyncio
async def test_project_member_can_create_list_and_open_link_resource(
    ac, test_user, test_project
):
    response = await ac.post(
        f"/resources/projects/{test_project['id']}",
        data={
            "title": "Design reference",
            "category": "Links",
            "description": "Shared reference for the project team.",
            "source_url": "https://example.com/design",
        },
    )
    assert response.status_code == 201, response.text
    resource = response.json()
    assert resource["title"] == "Design reference"
    assert resource["creator"]["id"] == test_user["id"]
    assert resource["file"] is None

    listing = await ac.get(f"/resources/projects/{test_project['id']}")
    assert listing.status_code == 200, listing.text
    assert [item["id"] for item in listing.json()] == [resource["id"]]

    opened = await ac.post(f"/resources/{resource['id']}/open")
    assert opened.status_code == 200, opened.text
    assert opened.json()["url"] == "https://example.com/design"

    refreshed = await ac.get(f"/resources/projects/{test_project['id']}")
    assert refreshed.json()[0]["uses"] == 1


@pytest.mark.asyncio
async def test_user_without_project_access_cannot_list_resources(
    ac, db_session, test_another_user, test_project
):
    outsider = await db_session.get(User, test_another_user["id"])
    assert outsider is not None

    async def override_current_user():
        return outsider

    app.dependency_overrides[current_active_user] = override_current_user
    try:
        response = await ac.get(f"/resources/projects/{test_project['id']}")
        assert response.status_code == 403, response.text
    finally:
        app.dependency_overrides.pop(current_active_user, None)