"""
Unit tests for workload calculation logic.

Covers: complexity points, urgency multipliers, effective points (incl. SUBMITTED),
member totals, median baseline, capacity multiplier, overload detection,
role filtering for the median (bug 8), and minimum-deadline validation.

Requires: pytest, pytest-asyncio, freezegun (>=1.3)
"""

import pytest
from datetime import date, timedelta
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

from freezegun import freeze_time

from app.modules.redistribution_recommendations.workload_calculation import (
    complexity_to_points,
    calculate_urgency_multiplier,
    calculate_effective_points,
    calculate_member_workload_totals,
    recompute_workload_state,
    validate_task_deadline,
)
from app.modules.tasks.model import Task
from app.modules.tasks.enums import Status as TaskStatus, Complexity
from app.modules.project_members.model import ProjectMember
from app.modules.projects.model import Project

MODULE = "app.modules.redistribution_recommendations.workload_calculation"

# TODO: replace these with your real project-role enum members once you
# confirm the enum (e.g. ProjectRole.LEADER). Only used by the bug-8 test.
ROLE_LEADER = "LEADER"
ROLE_MEMBER = "MEMBER"
ROLE_ADVISOR = "ADVISOR"
ROLE_INSTRUCTOR = "INSTRUCTOR"


# --------------------------------------------------------------------------- #
# Fixtures / helpers
# --------------------------------------------------------------------------- #

@pytest.fixture(autouse=True)
def frozen_today():
    """Freeze 'today' so deadline-boundary tests can't flake around midnight."""
    with freeze_time("2026-09-21", real_asyncio=True):
        yield


def days_from_today(n: int) -> date:
    return date.today() + timedelta(days=n)


def make_task(status, complexity, days=None):
    """Task mock. days=None means no deadline."""
    task = MagicMock(spec=Task)
    task.status = status
    task.complexity = complexity
    task.deadline = None if days is None else days_from_today(days)
    return task


def make_member(role=None):
    member = MagicMock(spec=ProjectMember)
    member.id = uuid4()
    member.project_role = role  # None is treated as MEMBER per spec
    return member


def make_snapshot(capacity_multiplier):
    return MagicMock(capacity_multiplier=capacity_multiplier, silence_warning=False)


def patch_recompute(monkeypatch, members, totals_by_id, snapshot=None, base_days_per_point=1):
    """Patch everything recompute_workload_state depends on.

    totals_by_id maps member.id -> (total_points, total_effective_points).
    snapshot=None means no snapshot exists (capacity multiplier defaults to 1.0).
    """
    monkeypatch.setattr(
        f"{MODULE}.ProjectMemberService.get_all_members_by_project",
        AsyncMock(return_value=members),
    )
    monkeypatch.setattr(
        f"{MODULE}.calculate_member_workload_totals",
        AsyncMock(side_effect=lambda db, mid: totals_by_id[mid]),
    )
    monkeypatch.setattr(
        f"{MODULE}.ProjectService.get_one_project",
        AsyncMock(return_value=MagicMock(base_days_per_point=base_days_per_point)),
    )
    monkeypatch.setattr(
        f"{MODULE}.get_latest_member_snapshot",
        AsyncMock(return_value=snapshot),
    )


def by_member_id(results):
    return {r["member_id"]: r for r in results}


# --------------------------------------------------------------------------- #
# Complexity points
# --------------------------------------------------------------------------- #

class TestComplexityPoints:
    @pytest.mark.parametrize(
        "complexity, expected",
        [
            (Complexity.LOW, 1),
            (Complexity.MEDIUM, 2),
            (Complexity.HIGH, 3),
            (None, 0),
        ],
    )
    def test_complexity_to_points(self, complexity, expected):
        assert complexity_to_points(complexity) == expected


# --------------------------------------------------------------------------- #
# Urgency multiplier
# --------------------------------------------------------------------------- #

class TestUrgencyMultiplier:
    @pytest.mark.parametrize(
        "days, expected",
        [
            (-1, 1.5),   # overdue
            (0, 1.5),    # due today
            (3, 1.5),    # boundary: <= 3
            (4, 1.25),
            (7, 1.25),   # boundary: <= 7
            (8, 1.0),
            (14, 1.0),   # boundary: <= 14
            (15, 0.75),
            (20, 0.75),
        ],
    )
    def test_days_to_deadline(self, days, expected):
        assert calculate_urgency_multiplier(days_from_today(days)) == expected

    def test_no_deadline(self):
        # No deadline is treated as the 14-day bucket (1.0)
        assert calculate_urgency_multiplier(None) == 1.0


# --------------------------------------------------------------------------- #
# Effective points
# --------------------------------------------------------------------------- #

class TestEffectivePoints:
    @pytest.mark.parametrize(
        "status, complexity, days, expected",
        [
            # NOT_STARTED = points * urgency
            (TaskStatus.NOT_STARTED, Complexity.MEDIUM, 2, 3.0),      # 2 * 1.5
            (TaskStatus.NOT_STARTED, Complexity.HIGH, None, 3.0),     # 3 * 1.0
            (TaskStatus.NOT_STARTED, Complexity.LOW, 20, 0.75),       # 1 * 0.75
            (TaskStatus.NOT_STARTED, Complexity.MEDIUM, 20, 1.5),     # 2 * 0.75
            # IN_PROGRESS = points * 1.0 (no urgency scaling, even when urgent/overdue)
            (TaskStatus.IN_PROGRESS, Complexity.LOW, 1, 1.0),
            (TaskStatus.IN_PROGRESS, Complexity.MEDIUM, 2, 2.0),
            (TaskStatus.IN_PROGRESS, Complexity.HIGH, -5, 3.0),
            # SUBMITTED and COMPLETED count as zero
            (TaskStatus.SUBMITTED, Complexity.HIGH, 2, 0.0),
            (TaskStatus.SUBMITTED, Complexity.HIGH, -5, 0.0),
            (TaskStatus.COMPLETED, Complexity.HIGH, -5, 0.0),
            (TaskStatus.COMPLETED, Complexity.HIGH, None, 0.0),
            # status None is treated like NOT_STARTED
            (None, Complexity.HIGH, 2, 4.5),                          # 3 * 1.5
            # no complexity -> zero points
            (TaskStatus.NOT_STARTED, None, 2, 0.0),
        ],
    )
    def test_effective_points(self, status, complexity, days, expected):
        task = make_task(status, complexity, days)
        assert calculate_effective_points(task) == expected


# --------------------------------------------------------------------------- #
# Member workload totals
# --------------------------------------------------------------------------- #

class TestMemberWorkloadTotals:
    @pytest.mark.asyncio
    async def test_member_with_mixed_tasks(self, monkeypatch):
        tasks = [
            make_task(TaskStatus.NOT_STARTED, Complexity.MEDIUM, 1),   # raw 2, eff 3.0
            make_task(TaskStatus.IN_PROGRESS, Complexity.HIGH, 1),     # raw 3, eff 3.0
            make_task(TaskStatus.COMPLETED, Complexity.LOW, 1),        # excluded
            make_task(TaskStatus.SUBMITTED, Complexity.HIGH, 1),       # excluded
            make_task(TaskStatus.NOT_STARTED, Complexity.LOW, 10),     # raw 1, eff 1.0
        ]
        monkeypatch.setattr(
            f"{MODULE}.get_member_tasks", AsyncMock(return_value=tasks)
        )

        total_points, total_effective = await calculate_member_workload_totals(
            AsyncMock(), uuid4()
        )

        assert total_points == 6.0       # 2 + 3 + 1
        assert total_effective == 7.0    # 3.0 + 3.0 + 1.0

    @pytest.mark.asyncio
    async def test_submitted_and_completed_excluded_from_both_totals(self, monkeypatch):
        tasks = [
            make_task(TaskStatus.NOT_STARTED, Complexity.LOW, 20),     # raw 1, eff 0.75
            make_task(TaskStatus.SUBMITTED, Complexity.HIGH, 2),       # excluded
            make_task(TaskStatus.COMPLETED, Complexity.MEDIUM, None),  # excluded
        ]
        monkeypatch.setattr(
            f"{MODULE}.get_member_tasks", AsyncMock(return_value=tasks)
        )

        total_points, total_effective = await calculate_member_workload_totals(
            AsyncMock(), uuid4()
        )

        assert total_points == 1.0
        assert total_effective == 0.75

    @pytest.mark.asyncio
    async def test_member_with_no_tasks(self, monkeypatch):
        monkeypatch.setattr(
            f"{MODULE}.get_member_tasks", AsyncMock(return_value=[])
        )

        total_points, total_effective = await calculate_member_workload_totals(
            AsyncMock(), uuid4()
        )

        assert total_points == 0.0
        assert total_effective == 0.0


# --------------------------------------------------------------------------- #
# Recompute workload state
# --------------------------------------------------------------------------- #

class TestRecomputeWorkloadState:
    """
    Totals are tuples of (total_points, total_effective_points). Raw and
    effective are deliberately DIFFERENT so a bug that uses raw points for the
    baseline or the overload check gets caught. Expected values are hard-coded,
    not recomputed with the same formula the code uses.
    """

    @pytest.mark.asyncio
    async def test_odd_number_of_members_median(self, monkeypatch):
        # Deliberately unsorted. Effective: 10, 4, 6 -> median 6 (mean would be 6.67)
        members = [make_member() for _ in range(3)]
        totals = [(8.0, 10.0), (3.0, 4.0), (5.0, 6.0)]
        totals_by_id = {m.id: t for m, t in zip(members, totals)}
        patch_recompute(monkeypatch, members, totals_by_id)

        results = await recompute_workload_state(AsyncMock(), uuid4())

        assert len(results) == 3
        r = by_member_id(results)

        expected_overloaded = [True, False, False]  # 6.0 vs 6.0 pins strict '>'
        for member, total, overloaded in zip(members, totals, expected_overloaded):
            res = r[member.id]
            assert res["total_points"] == total[0]
            assert res["total_effective_points"] == total[1]
            assert res["expected_load"] == 6.0
            assert res["is_overloaded"] is overloaded
            assert res["capacity_multiplier"] == 1.0

    @pytest.mark.asyncio
    async def test_even_number_of_members_median(self, monkeypatch):
        # Effective: 2, 20, 4, 6 -> sorted [2, 4, 6, 20] -> median 5.0 (mean would be 8.0)
        members = [make_member() for _ in range(4)]
        totals = [(1.0, 2.0), (15.0, 20.0), (3.0, 4.0), (5.0, 6.0)]
        totals_by_id = {m.id: t for m, t in zip(members, totals)}
        patch_recompute(monkeypatch, members, totals_by_id)

        results = await recompute_workload_state(AsyncMock(), uuid4())

        assert len(results) == 4
        r = by_member_id(results)

        # 6.0 effective is overloaded vs 5.0 (its raw 5.0 would NOT be), so this
        # also proves overload is driven by effective points, not raw.
        expected_overloaded = [False, True, False, True]
        for member, total, overloaded in zip(members, totals, expected_overloaded):
            res = r[member.id]
            assert res["total_points"] == total[0]
            assert res["total_effective_points"] == total[1]
            assert res["expected_load"] == 5.0
            assert res["is_overloaded"] is overloaded
            assert res["capacity_multiplier"] == 1.0

    @pytest.mark.parametrize(
        "capacity, expected_load, overloaded",
        [
            (0.5, 2.0, True),    # 4.0 > 2.0
            (1.0, 4.0, False),   # 4.0 == 4.0, boundary is NOT overloaded
            (2.0, 8.0, False),   # 4.0 < 8.0
        ],
    )
    @pytest.mark.asyncio
    async def test_capacity_multiplier_effects(
        self, monkeypatch, capacity, expected_load, overloaded
    ):
        # Single member: baseline == its own effective points (4.0)
        member = make_member()
        patch_recompute(
            monkeypatch,
            [member],
            {member.id: (3.0, 4.0)},
            snapshot=make_snapshot(capacity),
        )

        results = await recompute_workload_state(AsyncMock(), uuid4())

        assert len(results) == 1
        res = results[0]
        assert res["total_effective_points"] == 4.0
        assert res["expected_load"] == expected_load
        assert res["is_overloaded"] is overloaded
        assert res["capacity_multiplier"] == capacity

    @pytest.mark.parametrize(
        "raw_value, clamped",
        [
            (-1.0, 0.01),   # below range -> minimum
            (0.0, 0.01),    # zero is not allowed -> minimum
            (1.0, 1.0),     # in range, unchanged
            (2.0, 2.0),     # maximum boundary
            (5.0, 2.0),     # above range -> maximum
        ],
    )
    @pytest.mark.asyncio
    async def test_capacity_multiplier_clamping(self, monkeypatch, raw_value, clamped):
        member = make_member()
        patch_recompute(
            monkeypatch,
            [member],
            {member.id: (10.0, 10.0)},
            snapshot=make_snapshot(raw_value),
        )

        results = await recompute_workload_state(AsyncMock(), uuid4())

        assert results[0]["capacity_multiplier"] == clamped

    # ----- Bug 8: only LEADER and MEMBER (and None) count toward the median ----- #
    # This test FAILS on current code (median includes advisors/instructors).
    # It is marked xfail(strict=True) so the suite stays green now and turns red
    # the moment bug 8 is fixed. When that happens, delete the marker.
    @pytest.mark.xfail(strict=True, reason="bug 8: median still includes ADVISOR/INSTRUCTOR")
    @pytest.mark.asyncio
    async def test_median_excludes_advisor_and_instructor(self, monkeypatch):
        leader = make_member(ROLE_LEADER)
        member = make_member(ROLE_MEMBER)
        no_role = make_member(None)  # None is treated as MEMBER
        instructor = make_member(ROLE_INSTRUCTOR)
        advisor = make_member(ROLE_ADVISOR)
        members = [leader, member, no_role, instructor, advisor]

        totals_by_id = {
            leader.id: (3.0, 4.0),
            member.id: (5.0, 6.0),
            no_role.id: (7.0, 8.0),
            instructor.id: (0.0, 0.0),
            advisor.id: (0.0, 0.0),
        }
        patch_recompute(monkeypatch, members, totals_by_id)

        results = await recompute_workload_state(AsyncMock(), uuid4())
        r = by_member_id(results)

        # Median of workers only [4, 6, 8] = 6. With the bug the median of
        # [0, 0, 4, 6, 8] would be 4 and the 6.0 worker would be flagged.
        for worker in (leader, member, no_role):
            assert r[worker.id]["expected_load"] == 6.0
        assert r[leader.id]["is_overloaded"] is False
        assert r[member.id]["is_overloaded"] is False
        assert r[no_role.id]["is_overloaded"] is True


# --------------------------------------------------------------------------- #
# Deadline validation
# --------------------------------------------------------------------------- #

class TestDeadlineValidation:
    """Minimum deadline = complexity_points * base_days_per_point days."""

    @pytest.mark.parametrize(
        "complexity, base_days, days_ahead, valid, min_days",
        [
            # LOW = 1 point, base 1 -> min 1 day
            (Complexity.LOW, 1, 1, True, 1),
            (Complexity.LOW, 1, 0, False, 1),    # same day
            (Complexity.LOW, 1, -1, False, 1),   # yesterday
            # MEDIUM = 2 points, base 1 -> min 2 days
            (Complexity.MEDIUM, 1, 2, True, 2),
            (Complexity.MEDIUM, 1, 1, False, 2),
            # HIGH = 3 points, base 1 -> min 3 days
            (Complexity.HIGH, 1, 3, True, 3),
            (Complexity.HIGH, 1, 2, False, 3),
            # Custom base_days_per_point: MEDIUM 2 * 2 = 4 days
            (Complexity.MEDIUM, 2, 4, True, 4),
            (Complexity.MEDIUM, 2, 3, False, 4),
        ],
    )
    @pytest.mark.asyncio
    async def test_minimum_deadline(self, complexity, base_days, days_ahead, valid, min_days):
        project = MagicMock(spec=Project)
        project.base_days_per_point = base_days
        task = make_task(TaskStatus.NOT_STARTED, complexity, days_ahead)

        is_valid, msg = await validate_task_deadline(task, project.base_days_per_point)

        assert is_valid is valid
        if valid:
            assert msg is None
        else:
            assert f"at least {min_days} day(s)" in msg

    @pytest.mark.asyncio
    async def test_completed_task_no_validation(self):
        task = make_task(TaskStatus.COMPLETED, Complexity.HIGH, -10)  # way overdue

        is_valid, msg = await validate_task_deadline(task, 1)

        assert is_valid is True
        assert msg is None

    @pytest.mark.asyncio
    async def test_no_deadline_always_valid(self):
        task = make_task(TaskStatus.NOT_STARTED, Complexity.HIGH, None)

        is_valid, msg = await validate_task_deadline(task, 1)

        assert is_valid is True
        assert msg is None

    @pytest.mark.asyncio
    async def test_zero_complexity_no_minimum(self):
        # complexity None -> 0 points -> no minimum, even with a very overdue deadline
        task = make_task(TaskStatus.NOT_STARTED, None, -100)

        is_valid, msg = await validate_task_deadline(task, 1)

        assert is_valid is True
        assert msg is None


if __name__ == "__main__":
    pytest.main([__file__])