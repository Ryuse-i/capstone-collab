#!/usr/bin/env python3
"""
Test script to verify the equal-share behavior for workload calculation.
This tests the specific scenarios mentioned in the requirements.
"""

import asyncio
from datetime import date, timedelta
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

from app.modules.project_snapshots.services import ProjectSnapshotService, _load_task_inputs
from app.modules.redistribution_recommendations import workload_math as wm
from app.modules.tasks.enums import Status as TaskStatus, Complexity
from app.modules.project_members.model import ProjectRole

D = Decimal
TODAY = date(2026, 9, 21)


def make_task(status, complexity, days=None, has_subtasks=False, deleted=False):
    """Task stand-in."""
    return SimpleNamespace(
        id=uuid4(),
        status=status,
        complexity=complexity,
        deadline=None if days is None else TODAY + timedelta(days=days),
        has_subtasks=has_subtasks,
        deleted_at=date(2026, 9, 1) if deleted else None,
    )


def make_member(role=None):
    """Member stand-in."""
    return SimpleNamespace(
        id=uuid4(),
        project_role=role,  # None is treated as MEMBER per spec
    )


def make_assignment(task, effort_share=None):
    """Assignment stand-in."""
    return SimpleNamespace(task_id=task.id, effort_share=effort_share)


async def test_scenario_a():
    """Scenario A: Task complexity = 3, Assigned members = [A], A contribution = 3"""
    print("Testing Scenario A: Single member assigned to task")

    member_a = make_member()
    task = make_task(TaskStatus.NOT_STARTED, Complexity.HIGH, days=3)  # HIGH = 3 points, due in 3 days

    # Mock the services properly
    assignments = {member_a.id: [make_assignment(task)]}
    task_assigned_members = {task.id: [make_member()]}  # 1 member assigned to the task

    # We need to patch the actual service methods
    import sys
    from unittest.mock import patch

    with patch('app.modules.assigned_members.services.AssignedMemberService.get_members') as mock_get_members, \
         patch('app.modules.assigned_members.services.AssignedMemberService.get_task_members') as mock_get_task_members, \
         patch('app.modules.tasks.services.TaskService.batch_get_task') as mock_batch_get_task:

        mock_get_members.return_value = assignments.get(member_a.id, [])
        mock_get_task_members.return_value = task_assigned_members.get(task.id, [])
        mock_batch_get_task.return_value = [task]

        inputs = await _load_task_inputs(AsyncMock(), member_a.id)

        assert len(inputs) == 1
        task_input = inputs[0]

        # Verify the share is 1.0 (1/1)
        assert task_input.effort_share == D("1"), f"Expected share 1.0, got {task_input.effort_share}"

        # Calculate member totals
        raw_points, eff_points = wm.member_totals([task_input], TODAY)

        # Debug: Let's check what the task_input looks like
        print(f"  Task input: state={task_input.state}, complexity_points={task_input.complexity_points}, effort_share={task_input.effort_share}")
        print(f"  Task deadline: {task_input.deadline}")
        print(f"  Today: {TODAY}")

        # For NOT_STARTED task with urgency multiplier (3 days out = 1.5x)
        # Raw: 3 * 1.0 = 3
        # Effective: 3 * 1.0 * 1.5 = 4.5
        assert raw_points == D("3"), f"Expected raw points 3, got {raw_points}"
        assert eff_points == D("4.5"), f"Expected effective points 4.5, got {eff_points}"

        print(f"  Raw points: {raw_points}")
        print(f"  Effective points: {eff_points}")
        print("  ✅ Scenario A passed")


async def test_scenario_b():
    """Scenario B: Task complexity = 3, Assigned members = [A, B], A contribution = 1.5, B contribution = 1.5"""
    print("\nTesting Scenario B: Two members assigned to task")

    member_a = make_member()
    member_b = make_member()
    task = make_task(TaskStatus.NOT_STARTED, Complexity.HIGH, days=3)  # HIGH = 3 points, due in 3 days

    # Mock the services properly
    assignments = {member_a.id: [make_assignment(task)], member_b.id: [make_assignment(task)]}
    task_assigned_members = {task.id: [make_member(), make_member()]}  # 2 members assigned to the task

    # We need to patch the actual service methods
    import sys
    from unittest.mock import patch

    with patch('app.modules.assigned_members.services.AssignedMemberService.get_members') as mock_get_members, \
         patch('app.modules.assigned_members.services.AssignedMemberService.get_task_members') as mock_get_task_members, \
         patch('app.modules.tasks.services.TaskService.batch_get_task') as mock_batch_get_task:

        mock_get_members.side_effect = lambda db, member_id: assignments.get(member_id, [])
        mock_get_task_members.side_effect = lambda db, task_id: task_assigned_members.get(task_id, [])
        mock_batch_get_task.return_value = [task]

        inputs_a = await _load_task_inputs(AsyncMock(), member_a.id)

        assert len(inputs_a) == 1
        task_input = inputs_a[0]

        # Verify the share is 0.5 (1/2)
        assert task_input.effort_share == D("0.5"), f"Expected share 0.5, got {task_input.effort_share}"

        # Calculate member totals
        raw_points, eff_points = wm.member_totals([task_input], TODAY)

        # For NOT_STARTED task with urgency multiplier (3 days out = 1.5x)
        # Raw: 3 * 0.5 = 1.5
        # Effective: 1.5 * 1.0 * 1.5 = 2.25
        assert raw_points == D("1.5"), f"Expected raw points 1.5, got {raw_points}"
        assert eff_points == D("2.25"), f"Expected effective points 2.25, got {eff_points}"

        print(f"  Raw points: {raw_points}")
        print(f"  Effective points: {eff_points}")
        print("  ✅ Scenario B passed")


async def test_scenario_c():
    """Scenario C: Task complexity = 3, Assigned members = [A, B, C], A contribution = 1, B contribution = 1, C contribution = 1"""
    print("\nTesting Scenario C: Three members assigned to task")

    member_a = make_member()
    member_b = make_member()
    member_c = make_member()
    task = make_task(TaskStatus.NOT_STARTED, Complexity.HIGH, days=3)  # HIGH = 3 points, due in 3 days

    # Mock the services properly
    assignments = {
        member_a.id: [make_assignment(task)],
        member_b.id: [make_assignment(task)],
        member_c.id: [make_assignment(task)]
    }
    task_assigned_members = {task.id: [make_member(), make_member(), make_member()]}  # 3 members assigned to the task

    # We need to patch the actual service methods
    from unittest.mock import patch

    with patch('app.modules.assigned_members.services.AssignedMemberService.get_members') as mock_get_members, \
         patch('app.modules.assigned_members.services.AssignedMemberService.get_task_members') as mock_get_task_members, \
         patch('app.modules.tasks.services.TaskService.batch_get_task') as mock_batch_get_task:

        mock_get_members.side_effect = lambda db, member_id: assignments.get(member_id, [])
        mock_get_task_members.side_effect = lambda db, task_id: task_assigned_members.get(task_id, [])
        mock_batch_get_task.return_value = [task]

        inputs_a = await _load_task_inputs(AsyncMock(), member_a.id)

        assert len(inputs_a) == 1
        task_input = inputs_a[0]

        # Verify the share is 1/3 (approximately 0.333...)
        expected_share = D("1") / D("3")
        assert task_input.effort_share == expected_share, f"Expected share {expected_share}, got {task_input.effort_share}"

        # Calculate member totals
        raw_points, eff_points = wm.member_totals([task_input], TODAY)

        # For NOT_STARTED task with urgency multiplier (3 days out = 1.5x)
        # Raw: 3 * (1/3) = 1
        # Effective: 1 * 1.0 * 1.5 = 1.5
        assert raw_points == D("1"), f"Expected raw points 1, got {raw_points}"
        assert eff_points == D("1.5"), f"Expected effective points 1.5, got {eff_points}"

        print(f"  Raw points: {raw_points}")
        print(f"  Effective points: {eff_points}")
        print("  ✅ Scenario C passed")


async def test_scenario_d():
    """Scenario D: Task complexity = 3, Assigned members = [], No member receives workload from the task."""
    print("\nTesting Scenario D: No members assigned to task")

    member_a = make_member()
    task = make_task(TaskStatus.NOT_STARTED, Complexity.HIGH)  # HIGH = 3 points

    # Mock the services properly
    assignments = {member_a.id: []}  # No assignments for member A
    task_assigned_members = {}  # No members assigned to the task

    # We need to patch the actual service methods
    from unittest.mock import patch

    with patch('app.modules.assigned_members.services.AssignedMemberService.get_members') as mock_get_members, \
         patch('app.modules.assigned_members.services.AssignedMemberService.get_task_members') as mock_get_task_members, \
         patch('app.modules.tasks.services.TaskService.batch_get_task') as mock_batch_get_task:

        mock_get_members.side_effect = lambda db, member_id: assignments.get(member_id, [])
        mock_get_task_members.side_effect = lambda db, task_id: task_assigned_members.get(task_id, [])
        mock_batch_get_task.return_value = [task]  # This won't be called since there are no assignments

        inputs = await _load_task_inputs(AsyncMock(), member_a.id)

        assert len(inputs) == 0, f"Expected no inputs, got {len(inputs)}"
        print("  ✅ Scenario D passed")


async def test_urgency_scaling_preserved():
    """Verify that urgency scaling still works correctly with the new share calculation."""
    print("\nTesting urgency scaling preservation")

    member = make_member()
    # Overdue task (negative days)
    task_overdue = make_task(TaskStatus.NOT_STARTED, Complexity.HIGH, days=-2)  # Overdue by 2 days
    # Future task
    task_future = make_task(TaskStatus.NOT_STARTED, Complexity.HIGH, days=10)  # Due in 10 days

    # Mock the services properly
    assignments = {member.id: [make_assignment(task_overdue), make_assignment(task_future)]}
    task_assigned_members = {
        task_overdue.id: [make_member()],  # 1 member assigned to overdue task
        task_future.id: [make_member()]    # 1 member assigned to future task
    }

    # We need to patch the actual service methods
    from unittest.mock import patch

    with patch('app.modules.assigned_members.services.AssignedMemberService.get_members') as mock_get_members, \
         patch('app.modules.assigned_members.services.AssignedMemberService.get_task_members') as mock_get_task_members, \
         patch('app.modules.tasks.services.TaskService.batch_get_task') as mock_batch_get_task:

        mock_get_members.side_effect = lambda db, member_id: assignments.get(member_id, [])
        mock_get_task_members.side_effect = lambda db, task_id: task_assigned_members.get(task_id, [])
        mock_batch_get_task.return_value = [task_overdue, task_future]

        inputs = await _load_task_inputs(AsyncMock(), member.id)

        assert len(inputs) == 2

        # Find the overdue and future task inputs
        overdue_input = None
        future_input = None
        for inp in inputs:
            if inp.deadline and (inp.deadline - TODAY).days < 0:
                overdue_input = inp
            else:
                future_input = inp

        assert overdue_input is not None
        assert future_input is not None

        # Both should have share = 1.0 (single member assigned)
        assert overdue_input.effort_share == D("1")
        assert future_input.effort_share == D("1")

        # Calculate member totals
        raw_points, eff_points = wm.member_totals(inputs, TODAY)

        # Debug: Let's check what the inputs look like
        print(f"  Number of inputs: {len(inputs)}")
        for i, inp in enumerate(inputs):
            print(f"  Input {i}: state={inp.state}, complexity_points={inp.complexity_points}, effort_share={inp.effort_share}, deadline={inp.deadline}")
            # Calculate individual task contributions
            from app.modules.redistribution_recommendations.workload_math import counted_points, effective_points
            cp = counted_points(inp)
            ep = effective_points(inp, TODAY)
            print(f"    Counted points: {cp}, Effective points: {ep}")

        # Overdue task: 3 points * 1.0 share = 3 raw, 3 * 1.5 urgency = 4.5 effective
        # Future task: 3 points * 1.0 share = 3 raw, 3 * 1.0 urgency = 3 effective
        # Total raw: 3 + 3 = 6.0
        # Total effective: 4.5 + 3 = 7.5

        print(f"  Expected raw points: 6.0, Actual: {raw_points}")
        print(f"  Expected effective points: 7.5, Actual: {eff_points}")

        assert raw_points == D("6.0"), f"Expected raw points 6.0, got {raw_points}"
        assert eff_points == D("7.5"), f"Expected effective points 7.5, got {eff_points}"

        print(f"  Raw points: {raw_points}")
        print(f"  Effective points: {eff_points}")
        print("  ✅ Urgency scaling preservation passed")


async def run_all_tests():
    """Run all test scenarios."""
    print("Running equal-share behavior tests...\n")

    await test_scenario_a()
    await test_scenario_b()
    await test_scenario_c()
    await test_scenario_d()
    await test_urgency_scaling_preserved()

    print("\n🎉 All tests passed!")


if __name__ == "__main__":
    asyncio.run(run_all_tests())