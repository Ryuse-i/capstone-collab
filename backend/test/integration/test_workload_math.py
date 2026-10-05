"""
Unit tests for the PURE workload logic (workload_math.py).

Ported from the previous workload_calculation tests. Same coverage and the same
numbers, with these differences:
  * No DB mocks, no monkeypatching, no freezegun: the pure module takes `today`
    as an argument, so every test passes a fixed date instead of freezing the clock.
  * Members are plain MemberInput rows (is_counted replaces the role check).
  * Money-like values are Decimal and quantized half-up to 2 places.

Covers: complexity points, urgency multipliers, effective points (incl. SUBMITTED,
shares, parent tasks), member totals, median baseline, capacity multiplier, overload
detection, advisor/instructor exclusion (bug 8), underutilized threshold, silence,
tolerance, median-0 edge case, quantization, minimum-deadline validation, extension
days and impact score.

Requires: pytest
"""

import pytest
from datetime import date, datetime, timedelta
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

from app.modules.redistribution_recommendations.workload_math import (
    Flag,
    MemberInput,
    TaskInput,
    TaskState,
    WorkloadConfig,
    classify,
    clean_capacity_multiplier,
    complexity_to_points,
    compute_baseline,
    compute_expected_load,
    compute_project_workload,
    effective_points,
    extension_days,
    impact_score,
    member_totals,
    q2,
    round_half_up_int,
    to_decimal,
    urgency_multiplier,
    validate_task_deadline,
)

D = Decimal

# Same "today" the old suite froze the clock to. Nothing here reads the real clock.
TODAY = date(2026, 9, 21)

# In the pure module COMPLETED and SUBMITTED are both "inactive" (count as zero).
NOT_STARTED = TaskState.NOT_STARTED
IN_PROGRESS = TaskState.IN_PROGRESS
SUBMITTED = TaskState.INACTIVE
COMPLETED = TaskState.INACTIVE


# --------------------------------------------------------------------------- #
# Fixtures / helpers
# --------------------------------------------------------------------------- #

def days_from_today(n: int) -> date:
    return TODAY + timedelta(days=n)


def make_task(state, complexity, days=None, share=None, is_parent=False):
    """TaskInput. complexity is 'low'/'medium'/'high'/None; days=None means no deadline."""
    return TaskInput(
        state=state,
        complexity_points=complexity_to_points(complexity),
        deadline=None if days is None else days_from_today(days),
        effort_share=share,
        is_parent=is_parent,
    )


def make_member(total_points, total_effective, capacity=None, silence=False, counted=True):
    """MemberInput. Raw and effective are passed separately on purpose (see recompute tests)."""
    return MemberInput(
        member_id=uuid4(),
        total_points=D(str(total_points)),
        total_effective_points=D(str(total_effective)),
        capacity_multiplier=None if capacity is None else D(str(capacity)),
        silence_warning=silence,
        is_counted=counted,
    )


def by_member_id(project_workload):
    return {r.member_id: r for r in project_workload.members}


# --------------------------------------------------------------------------- #
# Complexity points
# --------------------------------------------------------------------------- #

class TestComplexityPoints:
    @pytest.mark.parametrize(
        "complexity, expected",
        [
            ("low", 1),
            ("medium", 2),
            ("high", 3),
            (None, 0),
            ("High", 3),       # enum .value casing from the app
            ("LOW", 1),
            ("something", 0),  # unknown value counts as zero
        ],
    )
    def test_complexity_to_points(self, complexity, expected):
        assert complexity_to_points(complexity) == expected

    @pytest.mark.parametrize("name, value, expected", [("LOW", 1, 1), ("MEDIUM", "M", 2), ("HIGH", "x", 3), ("OTHER", 3, 0)])
    def test_enum_like_objects_are_read_by_name_first(self, name, value, expected):
        # Works even when the enum's VALUES are not "low"/"medium"/"high" (e.g. ints or letters).
        enum_like = SimpleNamespace(name=name, value=value)
        assert complexity_to_points(enum_like) == expected


# --------------------------------------------------------------------------- #
# Urgency multiplier
# --------------------------------------------------------------------------- #

class TestUrgencyMultiplier:
    @pytest.mark.parametrize(
        "days, expected",
        [
            (-1, "1.5"),    # overdue
            (0, "1.5"),     # due today
            (3, "1.5"),     # boundary: <= 3
            (4, "1.25"),
            (7, "1.25"),    # boundary: <= 7
            (8, "1.0"),
            (14, "1.0"),    # boundary: <= 14
            (15, "0.75"),
            (20, "0.75"),
        ],
    )
    def test_days_to_deadline(self, days, expected):
        assert urgency_multiplier(days_from_today(days), TODAY) == D(expected)

    def test_no_deadline(self):
        # No deadline is treated as the 14-day bucket (1.0)
        assert urgency_multiplier(None, TODAY) == D("1.0")

    def test_datetime_deadline_is_accepted(self):
        # Old code: datetime - date raised TypeError. Now normalized to a date first.
        assert urgency_multiplier(datetime(2026, 9, 22, 23, 59), TODAY) == D("1.5")

    def test_today_is_a_parameter_not_the_clock(self):
        # Same deadline, different "today" -> different bucket. This is what lets the
        # service pass a Manila date and keeps one pass consistent.
        deadline = date(2026, 10, 1)
        assert urgency_multiplier(deadline, date(2026, 9, 21)) == D("1.0")   # 10 days
        assert urgency_multiplier(deadline, date(2026, 9, 28)) == D("1.5")   # 3 days


# --------------------------------------------------------------------------- #
# Effective points
# --------------------------------------------------------------------------- #

class TestEffectivePoints:
    @pytest.mark.parametrize(
        "state, complexity, days, expected",
        [
            # NOT_STARTED = points * urgency
            (NOT_STARTED, "medium", 2, "3.0"),       # 2 * 1.5
            (NOT_STARTED, "high", None, "3.0"),      # 3 * 1.0
            (NOT_STARTED, "low", 20, "0.75"),        # 1 * 0.75
            (NOT_STARTED, "medium", 20, "1.5"),      # 2 * 0.75
            # IN_PROGRESS = points * 1.0 (no urgency scaling, even when urgent/overdue)
            (IN_PROGRESS, "low", 1, "1.0"),
            (IN_PROGRESS, "medium", 2, "2.0"),
            (IN_PROGRESS, "high", -5, "3.0"),
            # SUBMITTED and COMPLETED count as zero
            (SUBMITTED, "high", 2, "0.0"),
            (SUBMITTED, "high", -5, "0.0"),
            (COMPLETED, "high", -5, "0.0"),
            (COMPLETED, "high", None, "0.0"),
            # no complexity -> zero points
            (NOT_STARTED, None, 2, "0.0"),
        ],
    )
    def test_effective_points(self, state, complexity, days, expected):
        task = make_task(state, complexity, days)
        assert effective_points(task, TODAY) == D(expected)

    def test_effort_share_scales_the_task(self):
        # HIGH (3 pts), not started, due in 2 days (1.5x), member owns half -> 3 * 0.5 * 1.5
        task = make_task(NOT_STARTED, "high", 2, share=D("0.5"))
        assert effective_points(task, TODAY) == D("2.25")

    @pytest.mark.parametrize("share, expected", [(None, "2"), ("1", "2"), ("0", "0"), ("5", "2"), ("-1", "0")])
    def test_effort_share_is_bounded_to_0_1(self, share, expected):
        task = make_task(IN_PROGRESS, "medium", None, share=None if share is None else D(share))
        assert effective_points(task, TODAY) == D(expected)

    def test_parent_task_counts_zero(self):
        # Supertask: its subtasks carry the points, so counting both would double count.
        task = make_task(NOT_STARTED, "high", 2, is_parent=True)
        assert effective_points(task, TODAY) == D("0")


# --------------------------------------------------------------------------- #
# Member workload totals
# --------------------------------------------------------------------------- #

class TestMemberWorkloadTotals:
    def test_member_with_mixed_tasks(self):
        tasks = [
            make_task(NOT_STARTED, "medium", 1),    # raw 2, eff 3.0
            make_task(IN_PROGRESS, "high", 1),      # raw 3, eff 3.0
            make_task(COMPLETED, "low", 1),         # excluded
            make_task(SUBMITTED, "high", 1),        # excluded
            make_task(NOT_STARTED, "low", 10),      # raw 1, eff 1.0
        ]

        total_points, total_effective = member_totals(tasks, TODAY)

        assert total_points == D("6.00")        # 2 + 3 + 1
        assert total_effective == D("7.00")     # 3.0 + 3.0 + 1.0

    def test_submitted_and_completed_excluded_from_both_totals(self):
        tasks = [
            make_task(NOT_STARTED, "low", 20),       # raw 1, eff 0.75
            make_task(SUBMITTED, "high", 2),         # excluded
            make_task(COMPLETED, "medium", None),    # excluded
        ]

        total_points, total_effective = member_totals(tasks, TODAY)

        assert total_points == D("1.00")
        assert total_effective == D("0.75")

    def test_member_with_no_tasks(self):
        total_points, total_effective = member_totals([], TODAY)

        assert total_points == D("0.00")
        assert total_effective == D("0.00")

    def test_shared_task_is_counted_once_across_members(self):
        # HIGH task split 50/50: the two members together carry 3 points, not 6.
        a, _ = member_totals([make_task(IN_PROGRESS, "high", None, share=D("0.5"))], TODAY)
        b, _ = member_totals([make_task(IN_PROGRESS, "high", None, share=D("0.5"))], TODAY)
        assert a + b == D("3.00")

    def test_parent_and_subtasks_are_not_double_counted(self):
        tasks = [
            make_task(IN_PROGRESS, "high", None, is_parent=True),   # supertask: 0
            make_task(IN_PROGRESS, "low", None),                    # subtask: 1
            make_task(IN_PROGRESS, "medium", None),                 # subtask: 2
        ]
        assert member_totals(tasks, TODAY) == (D("3.00"), D("3.00"))


# --------------------------------------------------------------------------- #
# Capacity multiplier
# --------------------------------------------------------------------------- #

class TestCapacityMultiplier:
    @pytest.mark.parametrize(
        "raw_value, clamped",
        [
            (-1.0, "0.01"),    # below range -> minimum
            (0.0, "0.01"),     # zero is not allowed -> minimum
            (0.5, "0.5"),      # light-load role, valid
            (1.0, "1.0"),      # in range, unchanged
            (2.0, "2.0"),      # maximum boundary
            (5.0, "2.0"),      # above range -> maximum
            (None, "1.0"),     # unset -> default (old code crashed on Decimal(str(None)))
            ("abc", "1.0"),    # garbage -> default
        ],
    )
    def test_clamping(self, raw_value, clamped):
        assert clean_capacity_multiplier(raw_value) == D(clamped)

    @pytest.mark.parametrize("raw_value, clamped", [(-1.0, "0.01"), (0.0, "0.01"), (5.0, "2.0"), (None, "1.0")])
    def test_clamping_through_the_full_pipeline(self, raw_value, clamped):
        member = make_member(10, 10, capacity=None if raw_value is None else raw_value)
        result = compute_project_workload([member])
        assert result.members[0].capacity_multiplier == D(clamped)

    @pytest.mark.parametrize(
        "capacity, expected_load, overloaded",
        [
            (0.5, "2.00", True),     # 4.0 > 2.0
            (1.0, "4.00", False),    # 4.0 == 4.0, boundary is NOT overloaded
            (2.0, "8.00", False),    # 4.0 < 8.0
        ],
    )
    def test_capacity_multiplier_effects(self, capacity, expected_load, overloaded):
        # Single member: baseline == its own effective points (4.0)
        member = make_member(3, 4, capacity=capacity)

        result = compute_project_workload([member])

        assert len(result.members) == 1
        res = result.members[0]
        assert res.total_effective_points == D("4")
        assert res.expected_load == D(expected_load)
        assert res.is_over_threshold is overloaded
        assert res.capacity_multiplier == D(str(capacity))

    def test_hero_member_is_not_flagged_at_baseline_times_capacity(self):
        # Sole backend dev: capacity 1.5, baseline 10 -> may carry up to 15
        hero = make_member(14, 14, capacity=1.5)
        others = [make_member(10, 10) for _ in range(3)]

        result = compute_project_workload([hero] + others)

        assert result.members[0].expected_load == D("15.00")
        assert result.members[0].status is Flag.NORMAL

    def test_light_role_is_flagged_sooner(self):
        # Finance: capacity 0.5, baseline 10 -> expected 5, so 6 is already overloaded
        finance = make_member(6, 6, capacity=0.5)
        others = [make_member(10, 10), make_member(10, 10)]

        result = compute_project_workload([finance] + others)

        assert result.members[0].expected_load == D("5.00")
        assert result.members[0].status is Flag.OVERLOADED


# --------------------------------------------------------------------------- #
# Baseline + overload detection
# --------------------------------------------------------------------------- #

class TestComputeProjectWorkload:
    """
    Raw and effective points are deliberately DIFFERENT so a bug that uses raw points
    for the baseline or the overload check gets caught. Expected values are hard-coded,
    not recomputed with the same formula the code uses.
    """

    def test_odd_number_of_members_median(self):
        # Deliberately unsorted. Effective: 10, 4, 6 -> median 6 (mean would be 6.67)
        totals = [(8.0, 10.0), (3.0, 4.0), (5.0, 6.0)]
        members = [make_member(raw, eff) for raw, eff in totals]

        result = compute_project_workload(members)

        assert len(result.members) == 3
        assert result.baseline_points == D("6.00")
        r = by_member_id(result)

        expected_overloaded = [True, False, False]  # 6.0 vs 6.0 pins strict '>'
        for member, total, overloaded in zip(members, totals, expected_overloaded):
            res = r[member.member_id]
            assert res.total_points == D(str(total[0]))
            assert res.total_effective_points == D(str(total[1]))
            assert res.expected_load == D("6.00")
            assert res.is_over_threshold is overloaded
            assert res.capacity_multiplier == D("1.0")

    def test_even_number_of_members_median(self):
        # Effective: 2, 20, 4, 6 -> sorted [2, 4, 6, 20] -> median 5.0 (mean would be 8.0)
        totals = [(1.0, 2.0), (15.0, 20.0), (3.0, 4.0), (5.0, 6.0)]
        members = [make_member(raw, eff) for raw, eff in totals]

        result = compute_project_workload(members)

        assert len(result.members) == 4
        assert result.baseline_points == D("5.00")
        r = by_member_id(result)

        # 6.0 effective is overloaded vs 5.0 (its raw 5.0 would NOT be), so this
        # also proves overload is driven by effective points, not raw.
        expected_overloaded = [False, True, False, True]
        for member, total, overloaded in zip(members, totals, expected_overloaded):
            res = r[member.member_id]
            assert res.total_points == D(str(total[0]))
            assert res.total_effective_points == D(str(total[1]))
            assert res.expected_load == D("5.00")
            assert res.is_over_threshold is overloaded
            assert res.capacity_multiplier == D("1.0")

    def test_spec_example_5_2(self):
        # Spec 5.2: baseline (median) 10, Member A has 16 -> only A is overloaded.
        members = [make_member(0, v) for v in (16, 9, 6, 10, 10)]

        result = compute_project_workload(members)

        assert result.baseline_points == D("10.00")
        assert [r.status for r in result.members] == [
            Flag.OVERLOADED, Flag.NORMAL, Flag.NORMAL, Flag.NORMAL, Flag.NORMAL,
        ]

    def test_idle_members_stay_in_the_median(self):
        # 3 idle + 2 busy -> median 0, not the mean of the busy ones
        members = [make_member(0, 0), make_member(0, 0), make_member(0, 0), make_member(5, 5), make_member(7, 7)]
        assert compute_project_workload(members).baseline_points == D("0.00")

    def test_empty_project(self):
        result = compute_project_workload([])

        assert result.members == []
        assert result.baseline_points == D("0")
        assert result.total_effective_points == D("0")

    def test_project_total_is_sum_of_members(self):
        members = [make_member(0, "10.25"), make_member(0, "4.5"), make_member(0, "6.25")]

        assert compute_project_workload(members).total_effective_points == D("21.00")

    # ----- Bug 8: only LEADER and MEMBER (and None) count toward the median ----- #
    def test_median_excludes_advisor_and_instructor(self):
        leader = make_member(3, 4)
        member = make_member(5, 6)
        no_role = make_member(7, 8)                    # role None is MEMBER -> counted
        instructor = make_member(0, 0, counted=False)
        advisor = make_member(0, 0, counted=False)

        result = compute_project_workload([leader, member, no_role, instructor, advisor])
        r = by_member_id(result)

        # Median of workers only [4, 6, 8] = 6. With the bug the median of
        # [0, 0, 4, 6, 8] would be 4 and the 6.0 worker would be flagged.
        for worker in (leader, member, no_role):
            assert r[worker.member_id].expected_load == D("6.00")
        assert r[leader.member_id].is_over_threshold is False
        assert r[member.member_id].is_over_threshold is False
        assert r[no_role.member_id].is_over_threshold is True

        # Non-working members should never be flagged
        for non_worker in (instructor, advisor):
            assert r[non_worker.member_id].is_over_threshold is False
            assert r[non_worker.member_id].status is Flag.NORMAL

    def test_non_working_member_with_points_does_not_shift_median(self):
        # 3 working members with effective 4, 6, 8
        leader = make_member(3, 4)
        member = make_member(5, 6)
        no_role = make_member(7, 8)
        # Non-working member with high points (should not affect median or total)
        instructor = make_member(50, 60, counted=False)

        result = compute_project_workload([leader, member, no_role, instructor])
        r = by_member_id(result)

        for worker in (leader, member, no_role):
            assert r[worker.member_id].expected_load == D("6.00")
        assert result.total_effective_points == D("18.00")   # 4 + 6 + 8, instructor excluded
        # Non-working member still gets a row (so a stale OVERLOADED snapshot gets overwritten)
        assert r[instructor.member_id].is_over_threshold is False
        assert r[instructor.member_id].status is Flag.NORMAL
        assert r[instructor.member_id].is_counted is False

    def test_only_non_working_members(self):
        advisor1 = make_member(0, 0, counted=False)
        advisor2 = make_member(0, 0, counted=False)

        result = compute_project_workload([advisor1, advisor2])
        r = by_member_id(result)

        assert len(result.members) == 2
        assert result.baseline_points == D("0")
        assert result.total_effective_points == D("0")
        for advisor in (advisor1, advisor2):
            assert r[advisor.member_id].expected_load == D("0")
            assert r[advisor.member_id].is_over_threshold is False
            assert r[advisor.member_id].status is Flag.NORMAL

    # ----- Edge cases the old suite did not cover ----- #
    def test_median_zero_flags_anyone_holding_work(self):
        # Spec edge case: most members idle -> expected_load 0 -> any points = overloaded
        members = [make_member(0, 0), make_member(0, 0), make_member(0, 0), make_member(5, 5)]

        result = compute_project_workload(members)

        assert [r.status for r in result.members] == [Flag.NORMAL, Flag.NORMAL, Flag.NORMAL, Flag.OVERLOADED]

    def test_min_expected_load_floor_softens_the_median_zero_case(self):
        cfg = WorkloadConfig(min_expected_load=D("2"))
        members = [make_member(0, 0), make_member(0, 0), make_member(0, 0), make_member(2, "1.5")]

        result = compute_project_workload(members, cfg)

        assert result.members[3].expected_load == D("2.00")
        assert result.members[3].status is not Flag.OVERLOADED

    def test_single_member_team_is_never_overloaded(self):
        # Median of one value is that value, and equal is not overloaded.
        result = compute_project_workload([make_member(30, 30)])

        assert result.members[0].status is Flag.NORMAL

    def test_two_member_team_flags_the_heavier_one_on_any_difference(self):
        # With 2 members the median is their average, so the larger is always above it.
        # Documents the small-team behavior; use overload_tolerance to soften it.
        # (Baseline is rounded to 2 places, so the gap must survive that: 10.5 vs 10.0 -> 10.25.)
        members = [make_member(0, "10.5"), make_member(0, "10.0")]
        assert compute_project_workload(members).members[0].status is Flag.OVERLOADED

        cfg = WorkloadConfig(overload_tolerance=D("0.10"))
        assert compute_project_workload(members, cfg).members[0].status is Flag.NORMAL

    def test_overload_tolerance_band(self):
        members = [make_member(0, 10), make_member(0, 10), make_member(0, "10.5")]

        strict = compute_project_workload(members)
        banded = compute_project_workload(members, WorkloadConfig(overload_tolerance=D("0.10")))
        way_over = compute_project_workload(
            [make_member(0, 10), make_member(0, 10), make_member(0, 12)],
            WorkloadConfig(overload_tolerance=D("0.10")),
        )

        assert strict.members[2].status is Flag.OVERLOADED       # 10.5 > 10
        assert banded.members[2].status is Flag.NORMAL           # 10.5 <= 11.0
        assert way_over.members[2].status is Flag.OVERLOADED     # 12 > 11.0

    def test_normalize_by_capacity_uses_the_capacity_adjusted_median(self):
        # Hero (cap 2.0) carries 20, others 10. Raw median = 10; adjusted values = 10, 10, 10.
        members = [make_member(0, 20, capacity=2), make_member(0, 10), make_member(0, 10)]

        result = compute_project_workload(members, WorkloadConfig(normalize_by_capacity=True))

        assert result.baseline_points == D("10.00")
        assert result.members[0].expected_load == D("20.00")
        assert result.members[0].status is Flag.NORMAL


# --------------------------------------------------------------------------- #
# classify(): the single definition of overloaded / underutilized
# --------------------------------------------------------------------------- #

class TestClassify:
    CFG = WorkloadConfig()

    @pytest.mark.parametrize(
        "total, expected_load, status",
        [
            ("10.01", "10", Flag.OVERLOADED),    # strictly above
            ("10", "10", Flag.NORMAL),           # equal is NOT overloaded
            ("5", "10", Flag.NORMAL),            # exactly at the underutilized boundary (0.5)
            ("4.99", "10", Flag.UNDERUTILIZED),  # just below
            ("0", "10", Flag.UNDERUTILIZED),     # idle member against a real baseline
            ("1", "0", Flag.OVERLOADED),         # expected_load 0 -> any work is overloaded
            ("0", "0", Flag.NORMAL),             # nothing vs nothing
        ],
    )
    def test_classify(self, total, expected_load, status):
        assert classify(D(total), D(expected_load), self.CFG) is status


# --------------------------------------------------------------------------- #
# Underutilized threshold
# --------------------------------------------------------------------------- #

class TestUnderutilizedThreshold:
    """Verifies the UNDERUTILIZED threshold through the full compute_project_workload() pipeline."""

    def test_default_threshold_is_pinned(self):
        # DECISION MARKER. The previous suite assumed 0.8 and the previous code used 0.5;
        # the spec never defines it. If you decide on 0.8, change WorkloadConfig's default
        # AND this line, and every other test below keeps working unchanged.
        assert WorkloadConfig().underutilized_fraction == D("0.5")

    @pytest.mark.parametrize("fraction", ["0.5", "0.8"])
    def test_underutilized_boundary(self, fraction):
        # Four anchor members fixed at 10.0 effective points each, all capacity 1.0. With five
        # counted members (odd count) the median -- and therefore expected_load -- stays pinned
        # at 10.0 no matter what test_member's value is: test_member only ever sits at one end
        # of the sorted list, never displacing the anchors from the middle position.
        #
        # (Using just two members would be wrong: with two members the median is their AVERAGE,
        # so the baseline would move with test_member on every case.)
        cfg = WorkloadConfig(underutilized_fraction=D(fraction))
        boundary = D("10") * D(fraction)

        test_cases = [
            (boundary, Flag.NORMAL),                     # exactly on the boundary -> NORMAL
            (boundary - D("0.1"), Flag.UNDERUTILIZED),   # just below -> UNDERUTILIZED
            (boundary + D("0.1"), Flag.NORMAL),          # just above -> NORMAL
            (D("4.0"), Flag.UNDERUTILIZED),              # well below -> UNDERUTILIZED
        ]

        for total_effective, expected_status in test_cases:
            anchors = [make_member(0, 10) for _ in range(4)]
            test_member = make_member(0, total_effective)

            result = compute_project_workload(anchors + [test_member], cfg)
            res = by_member_id(result)[test_member.member_id]

            # Prove the baseline actually stayed pinned at 10.0 for this case,
            # not just that the final status happened to match.
            assert res.expected_load == D("10.00"), (
                f"Baseline shifted: expected_load should stay pinned at 10.0 "
                f"regardless of test_member's value, got {res.expected_load} "
                f"for total_effective={total_effective}"
            )
            assert res.status is expected_status, (
                f"For total_effective={total_effective} (fraction {fraction}), "
                f"expected {expected_status}, got {res.status}"
            )


# --------------------------------------------------------------------------- #
# silence_warning: never hides data
# --------------------------------------------------------------------------- #

class TestSilenceWarning:
    def test_silenced_member_keeps_true_status_and_numbers(self):
        # Old sketch saved a silenced member as BALANCED, which hid the data (spec 7.2).
        silenced = make_member(18, 20, silence=True)
        others = [make_member(9, 10), make_member(9, 10)]

        result = compute_project_workload([others[0], others[1], silenced])
        res = result.members[2]

        assert res.status is Flag.OVERLOADED                  # true status stays
        assert res.is_over_threshold is True                  # data stays visible
        assert res.warning_suppressed is True                 # only the nagging is suppressed
        assert res.total_effective_points == D("20")

    def test_unsilenced_overloaded_member_is_not_suppressed(self):
        members = [make_member(9, 10), make_member(9, 10), make_member(18, 20)]

        res = compute_project_workload(members).members[2]

        assert res.is_over_threshold is True
        assert res.warning_suppressed is False

    def test_silence_on_a_member_who_is_not_over_threshold_changes_nothing(self):
        members = [make_member(9, 10, silence=True), make_member(9, 10), make_member(9, 10)]

        res = compute_project_workload(members).members[0]

        assert res.status is Flag.NORMAL
        assert res.warning_suppressed is False


# --------------------------------------------------------------------------- #
# Decimal quantization (replaces the old create_or_update_member_snapshots test)
# --------------------------------------------------------------------------- #

class TestQuantization:
    """
    The old suite checked rounding at persistence time. The pure module now rounds
    once, half-up, at the edges, so the service just stores what it is given.
    """

    @pytest.mark.parametrize(
        "value, expected",
        [
            ("123.456", "123.46"),   # third decimal 6 >= 5 -> rounds up
            ("1.234", "1.23"),       # third decimal 4 < 5 -> stays down
            ("0.125", "0.13"),       # half-up (Python's round() would give 0.12)
            ("2.675", "2.68"),       # float repr trap: float 2.675 rounds to 2.67
            ("7", "7.00"),
        ],
    )
    def test_q2_rounds_half_up(self, value, expected):
        assert q2(D(value)) == D(expected)

    @pytest.mark.parametrize("value, expected", [("2.5", 3), ("2.4999", 2), ("0.5", 1), ("0", 0), ("10.49", 10)])
    def test_round_half_up_int(self, value, expected):
        assert round_half_up_int(D(value)) == expected

    def test_member_totals_are_quantized(self):
        # 1 pt, 0.333 share -> 0.333 -> 0.33
        total_points, total_effective = member_totals(
            [make_task(IN_PROGRESS, "low", None, share=D("0.333"))], TODAY
        )

        assert total_points == D("0.33")
        assert total_effective == D("0.33")

    def test_expected_load_is_quantized(self):
        # baseline 6.67 * 1.5 = 10.005 -> 10.01 (half-up)
        assert compute_expected_load(D("6.67"), D("1.5"), WorkloadConfig()) == D("10.01")

    def test_baseline_is_quantized(self):
        assert compute_baseline([D("1"), D("2.01")]) == D("1.51")   # 1.505 -> 1.51

    def test_to_decimal_is_safe(self):
        assert to_decimal(None) == D("0")
        assert to_decimal("x") == D("0")
        assert to_decimal(float("nan")) == D("0")
        assert to_decimal("1.5") == D("1.5")
        assert to_decimal(None, D("1")) == D("1")


# --------------------------------------------------------------------------- #
# Deadline validation
# --------------------------------------------------------------------------- #

class TestDeadlineValidation:
    """Minimum deadline = complexity_points * base_days_per_point days."""

    @pytest.mark.parametrize(
        "complexity, base_days, days_ahead, valid, min_days",
        [
            # LOW = 1 point, base 1 -> min 1 day
            ("low", 1, 1, True, 1),
            ("low", 1, 0, False, 1),    # same day
            ("low", 1, -1, False, 1),   # yesterday
            # MEDIUM = 2 points, base 1 -> min 2 days
            ("medium", 1, 2, True, 2),
            ("medium", 1, 1, False, 2),
            # HIGH = 3 points, base 1 -> min 3 days
            ("high", 1, 3, True, 3),
            ("high", 1, 2, False, 3),
            # Custom base_days_per_point: MEDIUM 2 * 2 = 4 days
            ("medium", 2, 4, True, 4),
            ("medium", 2, 3, False, 4),
        ],
    )
    def test_minimum_deadline(self, complexity, base_days, days_ahead, valid, min_days):
        is_valid, msg = validate_task_deadline(
            days_from_today(days_ahead), complexity_to_points(complexity), base_days, TODAY
        )

        assert is_valid is valid
        if valid:
            assert msg is None
        else:
            assert f"at least {min_days} day(s)" in msg

    def test_skipped_tasks_are_always_valid(self):
        # Completed / submitted tasks are not checked (caller passes skip=True)
        is_valid, msg = validate_task_deadline(days_from_today(-10), 3, 1, TODAY, skip=True)  # way overdue

        assert is_valid is True
        assert msg is None

    def test_no_deadline_always_valid(self):
        is_valid, msg = validate_task_deadline(None, 3, 1, TODAY)

        assert is_valid is True
        assert msg is None

    def test_zero_complexity_no_minimum(self):
        # complexity None -> 0 points -> no minimum, even with a very overdue deadline
        is_valid, msg = validate_task_deadline(days_from_today(-100), complexity_to_points(None), 1, TODAY)

        assert is_valid is True
        assert msg is None

    def test_datetime_deadline_is_accepted(self):
        is_valid, _ = validate_task_deadline(datetime(2026, 9, 25, 8, 0), 3, 1, TODAY)   # 4 days

        assert is_valid is True

    def test_message_reports_days_got(self):
        _, msg = validate_task_deadline(days_from_today(1), 3, 1, TODAY)

        assert "Got 1 day(s)" in msg

    def test_today_is_a_parameter(self):
        # Same deadline is valid from one "today" and invalid from another.
        deadline = date(2026, 9, 25)
        assert validate_task_deadline(deadline, 3, 1, date(2026, 9, 21))[0] is True    # 4 days
        assert validate_task_deadline(deadline, 3, 1, date(2026, 9, 24))[0] is False   # 1 day


# --------------------------------------------------------------------------- #
# Move Deadline extension (spec 4.4.1)
# --------------------------------------------------------------------------- #

class TestExtensionDays:
    @pytest.mark.parametrize(
        "points, base, total, expected_load, days",
        [
            (3, 1, "14", "10", 5),    # spec worked example: 3 * 1 * 1.4 = 4.2 -> 5
            (2, 1, "5", "10", 2),     # not overloaded: ratio floors at 1.0
            (1, 2, "10", "10", 2),    # ratio exactly 1
            (3, 1, "100", "1", 9),    # absurd overage is capped at 3x
            (3, 1, "5", "0", 9),      # expected_load 0: no ZeroDivisionError, capped ratio
            (0, 1, "14", "10", 0),    # no complexity -> no extension
            (3, 0, "14", "10", 0),    # base_days 0 -> no extension
        ],
    )
    def test_extension_days(self, points, base, total, expected_load, days):
        assert extension_days(points, base, D(total), D(expected_load)) == days


# --------------------------------------------------------------------------- #
# Impact score (spec 5.1)
# --------------------------------------------------------------------------- #

class TestImpactScore:
    def test_spec_worked_example(self):
        # baseline 10, Member A has 16. Option 1: move 4 pts to B (9 -> 13, expected 10) = 4 - 3
        # Option 2: move 3 pts to C (6 -> 9, expected 10) = 3 - 0
        option_1 = impact_score(D(16), D(10), D(4), D(13), D(10))
        option_2 = impact_score(D(16), D(10), D(3), D(9), D(10))

        assert option_1 == D(1)
        assert option_2 == D(3)
        assert option_2 > option_1   # the smaller move that lands cleanly outranks the bigger one

    def test_relief_is_capped_at_the_donors_overage(self):
        # Donor 12 vs expected 10 is only 2 over. Moving 5 should not score 5.
        assert impact_score(D(12), D(10), D(5), D(5), D(10)) == D(2)

    def test_recipient_at_or_under_threshold_has_no_penalty(self):
        assert impact_score(D(16), D(10), D(3), D(10), D(10)) == D(3)

    def test_negative_impact_is_possible_and_should_be_filtered_by_the_caller(self):
        assert impact_score(D(11), D(10), D(1), D(20), D(10)) < 0

    def test_donor_not_over_threshold_has_zero_relief(self):
        assert impact_score(D(8), D(10), D(3), D(5), D(10)) == D(0)


if __name__ == "__main__":
    pytest.main([__file__])