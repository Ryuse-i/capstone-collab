import pytest
from httpx import AsyncClient
from uuid import UUID


@pytest.mark.asyncio
async def test_get_task_comments_with_author(ac: AsyncClient, test_user: dict, test_task: dict):
    """Tests that getting task comments returns author information."""
    # Create a task comment
    payload = {
        "task_id": test_task["id"],
        "author_id": test_user["id"],
        "content": "Test comment with author",
    }
    create_response = await ac.post("/task_comments/", json=payload)
    assert create_response.status_code == 201
    comment_data = create_response.json()
    assert "id" in comment_data

    # Get the task comments for the task
    response = await ac.get(f"/task_comments/?task_id={test_task['id']}")
    assert response.status_code == 200
    comments = response.json()
    assert isinstance(comments, list)
    assert len(comments) > 0

    # Check that the first comment has author information
    first_comment = comments[0]
    assert "author" in first_comment
    assert first_comment["author"] is not None
    assert "id" in first_comment["author"]
    assert "first_name" in first_comment["author"]
    assert "last_name" in first_comment["author"]
    assert "email" in first_comment["author"]

    # Verify the author matches the user who created the comment
    assert first_comment["author"]["id"] == test_user["id"]
    assert first_comment["author"]["first_name"] == test_user["first_name"]
    assert first_comment["author"]["last_name"] == test_user["last_name"]
    assert first_comment["author"]["email"] == test_user["email"]


@pytest.mark.asyncio
async def test_get_one_task_comment_with_author(ac: AsyncClient, test_user: dict, test_task: dict):
    """Tests that getting a single task comment returns author information."""
    # Create a task comment
    payload = {
        "task_id": test_task["id"],
        "author_id": test_user["id"],
        "content": "Test comment for single fetch",
    }
    create_response = await ac.post("/task_comments/", json=payload)
    assert create_response.status_code == 201
    comment_data = create_response.json()
    comment_id = comment_data["id"]

    # Get the specific task comment
    response = await ac.get(f"/task_comments/{comment_id}")
    assert response.status_code == 200
    comment = response.json()

    # Check that the comment has author information
    assert "author" in comment
    assert comment["author"] is not None
    assert "id" in comment["author"]
    assert "first_name" in comment["author"]
    assert "last_name" in comment["author"]
    assert "email" in comment["author"]

    # Verify the author matches the user who created the comment
    assert comment["author"]["id"] == test_user["id"]
    assert comment["author"]["first_name"] == test_user["first_name"]
    assert comment["author"]["last_name"] == test_user["last_name"]
    assert comment["author"]["email"] == test_user["email"]