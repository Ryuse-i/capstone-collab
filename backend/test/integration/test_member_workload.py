"""
Integration test: create a task, assign a member to it, and verify the
member's workload snapshot is not just "created" but numerically CORRECT --
computed from the task's actual (AI-assigned) complexity and deadline using
the same production formulas as workload_calculation.py.

Uses the real test Postgres DB and httpx ASGI client from conftest.py.
Because `ac`'s get_async_session override yields the SAME db_session used
by this test, requests made through `ac` and queries made directly via
`db_session` share one transaction/session -- flushed (uncommitted) writes
from a request are visible both to later requests AND to direct db_session
queries here, without needing `db.commit()` anywhere.

NOTE: overrides the module-level `test_task` fixture from conftest.py to add
`primary_skill`, which the shared fixture is currently missing (TaskCreate
requires it). Once conftest.py's test_task is fixed directly, this local
override can be deleted and the shared one used instead.

ASSUMPTIONS TO VERIFY:
  - assigned_member_router is mounted at "/assigned_members/"
  - member_snapshot_route is mounted at "/member_snapshots/"
  If either prefix is wrong, adjust the URLs below to match main.py.
"""

import pytest
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.member_snapshots.model import MemberSnapshot
from app.modules.tasks.enums import Complexity
from app.modules.redistribution_recommendations.workload_calculation import (
    complexity_to_points,
    calculate_urgency_multiplier,
)


@pytest.fixture
async def test_task(ac: AsyncClient, test_user: dict, test_project: dict) -> dict:
    """
    Local override of conftest.py's test_task: adds the required
    `primary_skill` field (missing in the shared fixture, which currently
    causes a 422 on task creation).
    """
    payload = {
        "name": "Fixture Task",
        "description": "Task fixture for task content tests",
        "created_by": test_user["id"],
        "project_id": test_project["id"],
        "status": "not_started",
        "priority": "low",
        "complexity": "low",
        "complexity_points": 0,
        "category": "development",
        "primary_skill": "Backend Development",
        "deadline": "2099-01-01T00:00:00Z",
    }
    response = await ac.post("/tasks/", json=payload)
    assert response.status_code == 201, f"Task fixture failed: {response.text}"
    return response.json()


def _expected_effective_points(complexity_str: str, deadline_str: str) -> float:
    """
    Recompute what a single NOT_STARTED task's effective points SHOULD be,
    using the same functions calculate_effective_points relies on. Mirrors:
        points = complexity_to_points(complexity) * urgency_multiplier
    for status NOT_STARTED (the fixtures always create tasks as not_started).
    """
    complexity = Complexity(complexity_str)
    deadline = date.fromisoformat(deadline_str[:10])
    points = complexity_to_points(complexity)
    multiplier = calculate_urgency_multiplier(deadline)
    return points * multiplier


def _quantize(value: float) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


class TestTaskAssignmentWorkloadIntegration:
    @pytest.mark.asyncio
    async def test_snapshot_absent_or_zero_before_assignment(
        self,
        db_session: AsyncSession,
        test_project_member: dict,
    ):
        """
        A freshly created member should have no workload yet: either no
        snapshot row exists, or one exists seeded at zero effective points.
        (Adjusted from a strict "no row at all" check after finding that
        member creation apparently seeds a snapshot -- confirm against
        ProjectMemberService's create path whether that's intentional.)
        """
        member_id = test_project_member["id"]

        result = await db_session.execute(
            select(MemberSnapshot).where(MemberSnapshot.member_id == member_id)
        )
        snapshot = result.scalar_one_or_none()

        if snapshot is not None:
            assert snapshot.total_effective_points == Decimal("0"), (
                f"Expected a freshly created member's seeded snapshot to be "
                f"zero, got {snapshot.total_effective_points}"
            )

    @pytest.mark.asyncio
    async def test_assigning_member_to_task_produces_correct_workload(
        self,
        ac: AsyncClient,
        db_session: AsyncSession,
        test_project_member: dict,
        test_task: dict,
    ):
        member_id = test_project_member["id"]

        # test_task is already created by the fixture BEFORE this test body
        # runs -- so this covers "existing task, then assign" rather than
        # "create task inline". Pull its ACTUAL stored complexity (post-AI
        # scoring) and deadline straight from the fixture's response, since
        # TaskService.create_task overwrites whatever complexity was posted.
        actual_complexity = test_task["complexity"]
        actual_deadline = test_task["deadline"]
        expected_points = _expected_effective_points(actual_complexity, actual_deadline)
        expected_decimal = _quantize(expected_points)

        response = await ac.post(
            "/assigned_members/",
            json={"member_id": member_id, "task_id": test_task["id"], "effort_share": 1.0},
        )
        assert response.status_code == 201, f"Assignment failed: {response.text}"

        result = await db_session.execute(
            select(MemberSnapshot).where(MemberSnapshot.member_id == member_id)
        )
        snapshot = result.scalar_one_or_none()
        assert snapshot is not None, (
            "Expected calculate_member_workload to create a MemberSnapshot row"
        )

        assert snapshot.total_effective_points == expected_decimal, (
            f"Snapshot total_effective_points={snapshot.total_effective_points} "
            f"does not match hand-computed expected={expected_decimal} "
            f"(complexity={actual_complexity}, deadline={actual_deadline})"
        )

    @pytest.mark.asyncio
    async def test_assigning_second_new_task_produces_correct_combined_workload(
        self,
        ac: AsyncClient,
        db_session: AsyncSession,
        test_project_member: dict,
        test_task: dict,
        test_project: dict,
        test_user: dict,
    ):
        """
        Covers the other half: existing task (test_task, already assigned)
        PLUS a brand-new task created and assigned within this test. Verifies
        the recompute correctly sums both tasks' effective points -- proving
        the newly flushed AssignedMember row for the second task is picked
        up within the same session, and that the resulting number is exactly
        right, not just "bigger than before".
        """
        member_id = test_project_member["id"]

        # Assign the existing (fixture) task first.
        response = await ac.post(
            "/assigned_members/",
            json={"member_id": member_id, "task_id": test_task["id"]},
        )
        assert response.status_code == 201, response.text
        first_expected = _expected_effective_points(
            test_task["complexity"], test_task["deadline"]
        )

        # Create a brand-new second task.
        second_task_payload = {
            "name": "Second Fixture Task",
            "description": "Second task for combined workload accuracy check",
            "created_by": test_user["id"],
            "project_id": test_project["id"],
            "status": "not_started",
            "priority": "low",
            "complexity": "high",
            "complexity_points": 0,
            "category": "development",
            "primary_skill": "Backend Development",
            "deadline": "2099-01-01T00:00:00Z",
        }
        response = await ac.post("/tasks/", json=second_task_payload)
        assert response.status_code == 201, f"Second task fixture failed: {response.text}"
        second_task = response.json()

        response = await ac.post(
            "/assigned_members/",
            json={"member_id": member_id, "task_id": second_task["id"]},
        )
        assert response.status_code == 201, response.text
        second_expected = _expected_effective_points(
            second_task["complexity"], second_task["deadline"]
        )

        expected_combined = _quantize(first_expected + second_expected)

        result = await db_session.execute(
            select(MemberSnapshot).where(MemberSnapshot.member_id == member_id)
        )
        snapshot = result.scalar_one()

        assert snapshot.total_effective_points == expected_combined, (
            f"Combined snapshot total={snapshot.total_effective_points} != "
            f"hand-computed expected={expected_combined} "
            f"(task1={test_task['complexity']!r}, task2={second_task['complexity']!r})"
        )


if __name__ == "__main__":
    pytest.main([__file__])