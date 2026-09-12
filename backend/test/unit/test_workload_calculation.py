"""
Unit tests for workload calculation logic.
Tests the core calculation functions for effective_points, urgency multipliers,
member aggregates, baseline calculation, expected load, and overload detection.
"""

import pytest
from datetime import date, timedelta
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

from app.modules.redistribution_recommendations.workload_calculation import (
    complexity_to_points,
    calculate_urgency_multiplier,
    calculate_effective_points,
    calculate_member_workload_totals,
    recompute_workload_state,
    validate_task_deadline
)
from app.modules.tasks.model import Task
from app.modules.tasks.enums import Status as TaskStatus, Complexity, Priority
from app.modules.project_members.model import ProjectMember
from app.modules.member_snapshots.model import MemberSnapshot
from app.modules.projects.model import Project


class TestComplexityPoints:
    """Test complexity points conversion."""

    def test_low_complexity(self):
        assert complexity_to_points(Complexity.LOW) == 1

    def test_medium_complexity(self):
        assert complexity_to_points(Complexity.MEDIUM) == 2

    def test_high_complexity(self):
        assert complexity_to_points(Complexity.HIGH) == 3

    def test_none_complexity(self):
        assert complexity_to_points(None) == 0


class TestUrgencyMultiplier:
    """Test urgency multiplier calculation."""

    def test_overdue_task(self):
        # Overdue (yesterday)
        yesterday = date.today() - timedelta(days=1)
        assert calculate_urgency_multiplier(yesterday) == 1.5

    def test_three_days_until_deadline(self):
        # Exactly 3 days until deadline
        three_days = date.today() + timedelta(days=3)
        assert calculate_urgency_multiplier(three_days) == 1.5

    def test_four_days_until_deadline(self):
        # 4 days until deadline
        four_days = date.today() + timedelta(days=4)
        assert calculate_urgency_multiplier(four_days) == 1.25

    def test_seven_days_until_deadline(self):
        # Exactly 7 days until deadline
        seven_days = date.today() + timedelta(days=7)
        assert calculate_urgency_multiplier(seven_days) == 1.25

    def test_eight_days_until_deadline(self):
        # 8 days until deadline
        eight_days = date.today() + timedelta(days=8)
        assert calculate_urgency_multiplier(eight_days) == 1.0

    def test_fourteen_days_until_deadline(self):
        # Exactly 14 days until deadline
        fourteen_days = date.today() + timedelta(days=14)
        assert calculate_urgency_multiplier(fourteen_days) == 1.0

    def test_fifteen_days_until_deadline(self):
        # 15 days until deadline
        fifteen_days = date.today() + timedelta(days=15)
        assert calculate_urgency_multiplier(fifteen_days) == 0.75

    def test_no_deadline(self):
        # No deadline should be treated as 14-day bucket (1.0)
        assert calculate_urgency_multiplier(None) == 1.0


class TestEffectivePoints:
    """Test effective points calculation."""

    def test_not_started_with_deadline(self):
        task = MagicMock(spec=Task)
        task.status = TaskStatus.NOT_STARTED
        task.complexity = Complexity.MEDIUM  # 2 points
        task.deadline = date.today() + timedelta(days=2)  # <= 3 days -> 1.5x

        assert calculate_effective_points(task) == 3.0  # 2 * 1.5

    def test_not_started_no_deadline(self):
        task = MagicMock(spec=Task)
        task.status = TaskStatus.NOT_STARTED
        task.complexity = Complexity.HIGH  # 3 points
        task.deadline = None  # No deadline -> 1.0x

        assert calculate_effective_points(task) == 3.0  # 3 * 1.0

    def test_in_progress_task(self):
        task = MagicMock(spec=Task)
        task.status = TaskStatus.IN_PROGRESS
        task.complexity = Complexity.LOW  # 1 point
        task.deadline = date.today() + timedelta(days=1)  # Overdue, but should not matter

        assert calculate_effective_points(task) == 1.0  # 1 * 1.0 (no urgency scaling)

    def test_completed_task(self):
        task = MagicMock(spec=Task)
        task.status = TaskStatus.COMPLETED
        task.complexity = Complexity.HIGH  # 3 points
        task.deadline = date.today() - timedelta(days=5)  # Overdue

        assert calculate_effective_points(task) == 0.0  # Completed tasks excluded

    def test_low_complexity_far_deadline(self):
        task = MagicMock(spec=Task)
        task.status = TaskStatus.NOT_STARTED
        task.complexity = Complexity.LOW  # 1 point
        task.deadline = date.today() + timedelta(days=20)  # > 14 days -> 0.75x

        assert calculate_effective_points(task) == 0.75  # 1 * 0.75


class TestMemberWorkloadTotals:
    """Test member workload totals calculation."""

    @pytest.mark.asyncio
    async def test_member_with_mixed_tasks(self):
        # Setup mock member
        member_id = uuid4()

        # Setup mock tasks
        task_not_started_urgent = MagicMock(spec=Task)
        task_not_started_urgent.status = TaskStatus.NOT_STARTED
        task_not_started_urgent.complexity = Complexity.MEDIUM  # 2 points
        task_not_started_urgent.deadline = date.today() + timedelta(days=1)  # <= 3 days -> 1.5x

        task_in_progress = MagicMock(spec=Task)
        task_in_progress.status = TaskStatus.IN_PROGRESS
        task_in_progress.complexity = Complexity.HIGH  # 3 points
        task_in_progress.deadline = date.today() + timedelta(days=1)  # Should not matter

        task_completed = MagicMock(spec=Task)
        task_completed.status = TaskStatus.COMPLETED
        task_completed.complexity = Complexity.LOW  # 1 point
        task_completed.deadline = date.today() + timedelta(days=1)  # Should be excluded

        task_not_started_later = MagicMock(spec=Task)
        task_not_started_later.status = TaskStatus.NOT_STARTED
        task_not_started_later.complexity = Complexity.LOW  # 1 point
        task_not_started_later.deadline = date.today() + timedelta(days=10)  # <= 14 days -> 1.0x

        tasks = [task_not_started_urgent, task_in_progress, task_completed, task_not_started_later]

        # Mock the service calls
        with pytest.MonkeyPatch().context() as mp:
            mp.setattr(
                "app.modules.redistribution_recommendations.workload_calculation.get_member_tasks",
                AsyncMock(return_value=tasks)
            )

            total_points, total_effective = await calculate_member_workload_totals(
                AsyncMock(), member_id
            )

        # Expected:
        # Not started urgent: 2 * 1.5 = 3.0 effective, 2.0 raw
        # In progress: 3 * 1.0 = 3.0 effective, 3.0 raw (no urgency scaling)
        # Completed: excluded from both
        # Not started later: 1 * 1.0 = 1.0 effective, 1.0 raw
        #
        # Total points: 2 + 3 + 1 = 6.0
        # Total effective: 3.0 + 3.0 + 1.0 = 7.0

        assert total_points == 6.0
        assert total_effective == 7.0

    @pytest.mark.asyncio
    async def test_member_with_no_tasks(self):
        member_id = uuid4()

        with pytest.MonkeyPatch().context() as mp:
            mp.setattr(
                "app.modules.redistribution_recommendations.workload_calculation.get_member_tasks",
                AsyncMock(return_value=[])
            )

            total_points, total_effective = await calculate_member_workload_totals(
                AsyncMock(), member_id
            )

        assert total_points == 0.0
        assert total_effective == 0.0


class TestRecomputeWorkloadState:
    """Test the main workload state recomputation."""

    @pytest.mark.asyncio
    async def test_odd_number_of_members_median(self):
        # Setup project with 3 members
        project_id = uuid4()
        member_ids = [uuid4(), uuid4(), uuid4()]
        members = []
        for member_id in member_ids:
            member = MagicMock(spec=ProjectMember)
            member.member_id = member_id
            members.append(member)

        # Mock member workload totals
        # Member 1: 4.0 effective points
        # Member 2: 6.0 effective points (median)
        # Member 3: 10.0 effective points
        member_totals = [
            (4.0, 4.0),   # (total_points, total_effective_points)
            (6.0, 6.0),
            (10.0, 10.0)
        ]

        with pytest.MonkeyPatch().context() as mp:
            mp.setattr(
                "app.modules.redistribution_recommendations.workload_calculation.ProjectMemberService.get_all_members_by_project",
                AsyncMock(return_value=members)
            )
            mp.setattr(
                "app.modules.redistribution_recommendations.workload_calculation.calculate_member_workload_totals",
                AsyncMock(side_effect=lambda db, mid: member_totals[member_ids.index(mid)])
            )
            mp.setattr(
                "app.modules.redistribution_recommendations.workload_calculation.ProjectService.get_one_project",
                AsyncMock(return_value=MagicMock(base_days_per_point=1))
            )
            mp.setattr(
                "app.modules.redistribution_recommendations.workload_calculation.get_latest_member_snapshot",
                AsyncMock(return_value=None))  # Default capacity multiplier 1.0

            results = await recompute_workload_state(AsyncMock(), project_id)

        assert len(results) == 3

        # Baseline should be median of [4.0, 6.0, 10.0] = 6.0
        baseline = 6.0

        # Check each member
        for i, result in enumerate(results):
            expected_load = baseline * 1.0  # capacity multiplier = 1.0
            is_overloaded = member_totals[i][1] > expected_load

            assert result["member_id"] == member_ids[i]
            assert result["total_points"] == member_totals[i][0]
            assert result["total_effective_points"] == member_totals[i][1]
            assert result["expected_load"] == expected_load
            assert result["is_overloaded"] == is_overloaded
            assert result["capacity_multiplier"] == 1.0

    @pytest.mark.asyncio
    async def test_even_number_of_members_median(self):
        # Setup project with 4 members
        project_id = uuid4()
        member_ids = [uuid4(), uuid4(), uuid4(), uuid4()]
        members = []
        for member_id in member_ids:
            member = MagicMock(spec=ProjectMember)
            member.member_id = member_id
            members.append(member)

        # Mock member workload totals
        # Sorted: [2.0, 4.0, 6.0, 8.0]
        # Median should be (4.0 + 6.0) / 2 = 5.0
        member_totals = [
            (2.0, 2.0),
            (8.0, 8.0),
            (4.0, 4.0),
            (6.0, 6.0)
        ]

        with pytest.MonkeyPatch().context() as mp:
            mp.setattr(
                "app.modules.redistribution_recommendations.workload_calculation.ProjectMemberService.get_all_members_by_project",
                AsyncMock(return_value=members)
            )
            mp.setattr(
                "app.modules.redistribution_recommendations.workload_calculation.calculate_member_workload_totals",
                AsyncMock(side_effect=lambda db, mid: member_totals[member_ids.index(mid)])
            )
            mp.setattr(
                "app.modules.redistribution_recommendations.workload_calculation.ProjectService.get_one_project",
                AsyncMock(return_value=MagicMock(base_days_per_point=1))
            )
            mp.setattr(
                "app.modules.redistribution_recommendations.workload_calculation.get_latest_member_snapshot",
                AsyncMock(return_value=None))  # Default capacity multiplier 1.0

            results = await recompute_workload_state(AsyncMock(), project_id)

        assert len(results) == 4

        # Baseline should be median of [2.0, 4.0, 6.0, 8.0] = 5.0
        baseline = 5.0

        # Check each member
        for i, result in enumerate(results):
            expected_load = baseline * 1.0  # capacity multiplier = 1.0
            is_overloaded = member_totals[i][1] > expected_load

            assert result["member_id"] == member_ids[i]
            assert result["total_points"] == member_totals[i][0]
            assert result["total_effective_points"] == member_totals[i][1]
            assert result["expected_load"] == expected_load
            assert result["is_overloaded"] == is_overloaded
            assert result["capacity_multiplier"] == 1.0

    @pytest.mark.asyncio
    async def test_capacity_multiplier_effects(self):
        # Test that capacity multiplier affects expected load and overload status
        project_id = uuid4()
        member_id = uuid4()
        member = MagicMock(spec=ProjectMember)
        member.member_id = member_id

        # Member with 4.0 effective points
        with pytest.MonkeyPatch().context() as mp:
            mp.setattr(
                "app.modules.redistribution_recommendations.workload_calculation.ProjectMemberService.get_all_members_by_project",
                AsyncMock(return_value=[member])
            )
            mp.setattr(
                "app.modules.redistribution_recommendations.workload_calculation.calculate_member_workload_totals",
                AsyncMock(return_value=(4.0, 4.0))  # 4.0 raw, 4.0 effective
            )
            mp.setattr(
                "app.modules.redistribution_recommendations.workload_calculation.ProjectService.get_one_project",
                AsyncMock(return_value=MagicMock(base_days_per_point=1))
            )

            # Test capacity multiplier = 0.5 (should expect 2.0 load, be overloaded at 4.0)
            mp.setattr(
                "app.modules.redistribution_recommendations.workload_calculation.get_latest_member_snapshot",
                AsyncMock(return_value=MagicMock(capacity_multiplier=0.5))
            )

            results = await recompute_workload_state(AsyncMock(), project_id)

            assert len(results) == 1
            result = results[0]
            assert result["total_effective_points"] == 4.0
            assert result["expected_load"] == 2.0  # 4.0 baseline * 0.5 capacity
            assert result["is_overloaded"] == True  # 4.0 > 2.0
            assert result["capacity_multiplier"] == 0.5

            # Test capacity multiplier = 2.0 (should expect 8.0 load, not overloaded at 4.0)
            mp.setattr(
                "app.modules.redistribution_recommendations.workload_calculation.get_latest_member_snapshot",
                AsyncMock(return_value=MagicMock(capacity_multiplier=2.0))
            )

            results = await recompute_workload_state(AsyncMock(), project_id)

            assert len(results) == 1
            result = results[0]
            assert result["total_effective_points"] == 4.0
            assert result["expected_load"] == 8.0  # 4.0 baseline * 2.0 capacity
            assert result["is_overloaded"] == False  # 4.0 < 8.0
            assert result["capacity_multiplier"] == 2.0

    @pytest.mark.asyncio
    async def test_capacity_multiplier_clamping(self):
        # Test that capacity multiplier is clamped to (0, 2.0] range
        project_id = uuid4()
        member_id = uuid4()
        member = MagicMock(spec=ProjectMember)
        member.member_id = member_id

        with pytest.MonkeyPatch().context() as mp:
            mp.setattr(
                "app.modules.redistribution_recommendations.workload_calculation.ProjectMemberService.get_all_members_by_project",
                AsyncMock(return_value=[member])
            )
            mp.setattr(
                "app.modules.redistribution_recommendations.workload_calculation.calculate_member_workload_totals",
                AsyncMock(return_value=(10.0, 10.0))
            )
            mp.setattr(
                "app.modules.redistribution_recommendations.workload_calculation.ProjectService.get_one_project",
                AsyncMock(return_value=MagicMock(base_days_per_point=1))
            )

            # Test clamping of negative value
            mp.setattr(
                "app.modules.redistribution_recommendations.workload_calculation.get_latest_member_snapshot",
                AsyncMock(return_value=MagicMock(capacity_multiplier=-1.0))
            )

            results = await recompute_workload_state(AsyncMock(), project_id)
            assert results[0]["capacity_multiplier"] == 0.01  # Clamped to minimum

            # Test clamping of excessive value
            mp.setattr(
                "app.modules.redistribution_recommendations.workload_calculation.get_latest_member_snapshot",
                AsyncMock(return_value=MagicMock(capacity_multiplier=5.0))
            )

            results = await recompute_workload_state(AsyncMock(), project_id)
            assert results[0]["capacity_multiplier"] == 2.0  # Clamped to maximum

            # Test boundary values
            mp.setattr(
                "app.modules.redistribution_recommendations.workload_calculation.get_latest_member_snapshot",
                AsyncMock(return_value=MagicMock(capacity_multiplier=0.0))
            )

            results = await recompute_workload_state(AsyncMock(), project_id)
            assert results[0]["capacity_multiplier"] == 0.01  # Clamped to minimum

            mp.setattr(
                "app.modules.redistribution_recommendations.workload_calculation.get_latest_member_snapshot",
                AsyncMock(return_value=MagicMock(capacity_multiplier=2.0))
            )

            results = await recompute_workload_state(AsyncMock(), project_id)
            assert results[0]["capacity_multiplier"] == 2.0  # At maximum


class TestDeadlineValidation:
    """Test minimum deadline validation."""

    @pytest.mark.asyncio
    async def test_low_complexity_min_deadline(self):
        # Low complexity (1 point) * 1 base day = 1 day minimum
        project = MagicMock(spec=Project)
        project.base_days_per_point = 1

        task = MagicMock(spec=Task)
        task.status = TaskStatus.NOT_STARTED
        task.complexity = Complexity.LOW

        # Valid: 1 day ahead
        task.deadline = date.today() + timedelta(days=1)
        is_valid, msg = await validate_task_deadline(task, project.base_days_per_point)
        assert is_valid == True
        assert msg is None

        # Invalid: same day (0 days ahead)
        task.deadline = date.today()
        is_valid, msg = await validate_task_deadline(task, project.base_days_per_point)
        assert is_valid == False
        assert "at least 1 day(s)" in msg

        # Invalid: yesterday
        task.deadline = date.today() - timedelta(days=1)
        is_valid, msg = await validate_task_deadline(task, project.base_days_per_point)
        assert is_valid == False
        assert "at least 1 day(s)" in msg

    @pytest.mark.asyncio
    async def test_medium_complexity_min_deadline(self):
        # Medium complexity (2 points) * 1 base day = 2 days minimum
        project = MagicMock(spec=Project)
        project.base_days_per_point = 1

        task = MagicMock(spec=Task)
        task.status = TaskStatus.NOT_STARTED
        task.complexity = Complexity.MEDIUM

        # Valid: 2 days ahead
        task.deadline = date.today() + timedelta(days=2)
        is_valid, msg = await validate_task_deadline(task, project.base_days_per_point)
        assert is_valid == True
        assert msg is None

        # Invalid: 1 day ahead
        task.deadline = date.today() + timedelta(days=1)
        is_valid, msg = await validate_task_deadline(task, project.base_days_per_point)
        assert is_valid == False
        assert "at least 2 day(s)" in msg

    @pytest.mark.asyncio
    async def test_high_complexity_min_deadline(self):
        # High complexity (3 points) * 1 base day = 3 days minimum
        project = MagicMock(spec=Project)
        project.base_days_per_point = 1

        task = MagicMock(spec=Task)
        task.status = TaskStatus.NOT_STARTED
        task.complexity = Complexity.HIGH

        # Valid: 3 days ahead
        task.deadline = date.today() + timedelta(days=3)
        is_valid, msg = await validate_task_deadline(task, project.base_days_per_point)
        assert is_valid == True
        assert msg is None

        # Invalid: 2 days ahead
        task.deadline = date.today() + timedelta(days=2)
        is_valid, msg = await validate_task_deadline(task, project.base_days_per_point)
        assert is_valid == False
        assert "at least 3 day(s)" in msg

    @pytest.mark.asyncio
    async def test_custom_base_days_per_point(self):
        # Test with project-specific base_days_per_point
        project = MagicMock(spec=Project)
        project.base_days_per_point = 2  # 2 days per point

        task = MagicMock(spec=Task)
        task.status = TaskStatus.NOT_STARTED
        task.complexity = Complexity.MEDIUM  # 2 points

        # Required: 2 points * 2 days/point = 4 days minimum

        # Valid: 4 days ahead
        task.deadline = date.today() + timedelta(days=4)
        is_valid, msg = await validate_task_deadline(task, project.base_days_per_point)
        assert is_valid == True
        assert msg is None

        # Invalid: 3 days ahead
        task.deadline = date.today() + timedelta(days=3)
        is_valid, msg = await validate_task_deadline(task, project.base_days_per_point)
        assert is_valid == False
        assert "at least 4 day(s)" in msg

    @pytest.mark.asyncio
    async def test_completed_task_no_validation(self):
        # Completed tasks should not be validated regardless of deadline
        project = MagicMock(spec=Project)
        project.base_days_per_point = 1

        task = MagicMock(spec=Task)
        task.status = TaskStatus.COMPLETED
        task.complexity = Complexity.HIGH
        task.deadline = date.today() - timedelta(days=10)  # Way overdue

        is_valid, msg = await validate_task_deadline(task, project.base_days_per_point)
        assert is_valid == True
        assert msg is None

    @pytest.mark.asyncio
    async def test_no_deadline_always_valid(self):
        # Tasks with no deadline should always be valid
        project = MagicMock(spec=Project)
        project.base_days_per_point = 1

        task = MagicMock(spec=Task)
        task.status = TaskStatus.NOT_STARTED
        task.complexity = Complexity.HIGH
        task.deadline = None

        is_valid, msg = await validate_task_deadline(task, project.base_days_per_point)
        assert is_valid == True
        assert msg is None

    @pytest.mark.asyncio
    async def test_zero_complexity_no_minimum(self):
        # Zero complexity points should have no minimum deadline
        project = MagicMock(spec=Project)
        project.base_days_per_point = 1

        task = MagicMock(spec=Task)
        task.status = TaskStatus.NOT_STARTED
        task.complexity = None  # Treat as 0 points
        task.deadline = date.today() - timedelta(days=100)  # Way overdue, but should be OK

        is_valid, msg = await validate_task_deadline(task, project.base_days_per_point)
        assert is_valid == True
        assert msg is None

        # Explicit zero
        task.complexity = Complexity.LOW  # This is 1 point, not zero
        # Actually, let's test with complexity that maps to 0 points
        # Since our mapping returns 0 for None, we already tested that above


if __name__ == "__main__":
    pytest.main([__file__])