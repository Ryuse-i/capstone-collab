"""
workload_math.py  -> app/modules/redistribution_recommendations/workload_math.py

PURE workload logic. Rules for this file:
  * No imports from app.* (no services, no models, no DB). That is what removes
    the circular import and makes everything unit-testable.
  * Nothing here calls date.today(). "today" is always passed in.
  * All money-like math is Decimal, rounded half-up to 2 places once, at the edges.

Services load data, convert it into the small dataclasses below, call
compute_project_workload(), and persist the result. Nothing else.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import ROUND_CEILING, ROUND_HALF_UP, Decimal, InvalidOperation
from enum import Enum
from statistics import median
from typing import Optional, Sequence, Union
from uuid import UUID

D0 = Decimal("0")
D1 = Decimal("1")
TWO_PLACES = Decimal("0.01")

MIN_CAPACITY_MULTIPLIER = Decimal("0.01")  # strictly positive (spec 2.5)
MAX_CAPACITY_MULTIPLIER = Decimal("2.0")   # spec 2.5
DEFAULT_CAPACITY_MULTIPLIER = D1           # spec 2.4


# --------------------------------------------------------------------------- #
# Types
# --------------------------------------------------------------------------- #
class Flag(str, Enum):
    """Workload classification. Names match MemberStatus (NORMAL/UNDERUTILIZED/OVERLOADED)
    so the service can map with MemberStatus[flag.name]."""
    NORMAL = "normal"
    UNDERUTILIZED = "underutilized"
    OVERLOADED = "overloaded"


class TaskState(str, Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    INACTIVE = "inactive"  # COMPLETED, SUBMITTED, cancelled, archived, unknown ... anything else


@dataclass(frozen=True)
class WorkloadConfig:
    """Tunable decisions. Defaults reproduce the spec; change them in ONE place."""
    underutilized_fraction: Decimal = Decimal("0.8")
    # 0 = strict spec behaviour (anything above expected_load is overloaded).
    # 0.10 = must exceed expected_load by more than 10% to be flagged.
    overload_tolerance: Decimal = D0
    # Floor for expected_load. 0 = off. With the median at 0, anyone holding work is
    # OVERLOADED (spec edge case). Raise it (e.g. 2) to stop one lone task flagging.
    min_expected_load: Decimal = D0
    # False = spec (median of raw effective points). True = median of points / capacity.
    normalize_by_capacity: bool = False


@dataclass(frozen=True)
class TaskInput:
    state: TaskState
    complexity_points: int
    deadline: Union[date, datetime, None] = None
    effort_share: Optional[Decimal] = None  # this member's fraction of the task, None = whole task
    is_parent: bool = False                 # supertask whose subtasks are assigned separately


@dataclass(frozen=True)
class MemberInput:
    member_id: UUID
    total_points: Decimal
    total_effective_points: Decimal
    capacity_multiplier: Optional[Decimal] = None
    silence_warning: bool = False
    is_counted: bool = True  # False for ADVISOR / INSTRUCTOR


@dataclass(frozen=True)
class MemberResult:
    member_id: UUID
    total_points: Decimal
    total_effective_points: Decimal
    capacity_multiplier: Decimal
    expected_load: Decimal
    status: Flag               # TRUE status, never hidden by silence
    is_over_threshold: bool    # status == OVERLOADED
    warning_suppressed: bool   # over threshold AND silenced -> don't nag, but data stays
    is_counted: bool


@dataclass(frozen=True)
class ProjectWorkload:
    baseline_points: Decimal
    members: list[MemberResult] = field(default_factory=list)
    total_effective_points: Decimal = D0


# --------------------------------------------------------------------------- #
# Small helpers
# --------------------------------------------------------------------------- #
def to_decimal(value, default: Decimal = D0) -> Decimal:
    """Safe conversion. None / garbage / NaN -> default instead of raising."""
    if value is None:
        return default
    try:
        d = value if isinstance(value, Decimal) else Decimal(str(value))
    except (InvalidOperation, ValueError):
        return default
    return d if d.is_finite() else default


def q2(value: Decimal) -> Decimal:
    return value.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


def round_half_up_int(value) -> int:
    return int(to_decimal(value).quantize(D1, rounding=ROUND_HALF_UP))


def to_date(value: Union[date, datetime, None]) -> Optional[date]:
    """Accept date or datetime. (datetime - date raises TypeError, so normalise first.)"""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    return value


COMPLEXITY_POINTS = {"low": 1, "medium": 2, "high": 3}


def complexity_to_points(complexity) -> int:
    """Works with an Enum (uses .value) or a plain string, any casing. None/unknown -> 0."""
    if complexity is None:
        return 0
    # Try the Enum member NAME first (LOW/MEDIUM/HIGH), then its value, so it works whether
    # your enum values are "low", "Low", "L" or numbers. Unknown -> 0.
    for candidate in (getattr(complexity, "name", None), getattr(complexity, "value", complexity)):
        key = str(candidate).strip().lower()
        if key in COMPLEXITY_POINTS:
            return COMPLEXITY_POINTS[key]
    return 0


def clean_capacity_multiplier(value) -> Decimal:
    """
    ONE rule used everywhere:
      None / not a number -> 1.0 (unset means default)
      <= 0                -> 0.01 (strictly positive floor)
      > 2.0               -> 2.0
    """
    if value is None:
        return DEFAULT_CAPACITY_MULTIPLIER
    d = to_decimal(value, default=DEFAULT_CAPACITY_MULTIPLIER)
    return min(max(d, MIN_CAPACITY_MULTIPLIER), MAX_CAPACITY_MULTIPLIER)


# --------------------------------------------------------------------------- #
# Task level
# --------------------------------------------------------------------------- #
def urgency_multiplier(deadline: Union[date, datetime, None], today: date) -> Decimal:
    d = to_date(deadline)
    if d is None:
        return D1
    days = (d - today).days  # negative when overdue
    if days <= 3:
        return Decimal("1.5")
    if days <= 7:
        return Decimal("1.25")
    if days <= 14:
        return D1
    return Decimal("0.75")


def _share(task: TaskInput) -> Decimal:
    if task.effort_share is None:
        return D1
    return min(max(to_decimal(task.effort_share, D1), D0), D1)


def counted_points(task: TaskInput) -> Decimal:
    """Raw points this task adds to the member (0 for finished/unknown/parent tasks)."""
    if task.state is TaskState.INACTIVE or task.is_parent:
        return D0
    return Decimal(max(task.complexity_points, 0)) * _share(task)


def effective_points(task: TaskInput, today: date) -> Decimal:
    base = counted_points(task)
    if base == 0:
        return D0
    if task.state is TaskState.NOT_STARTED:
        return base * urgency_multiplier(task.deadline, today)
    return base  # IN_PROGRESS: no urgency scaling


def member_totals(tasks: Sequence[TaskInput], today: date) -> tuple[Decimal, Decimal]:
    raw = sum((counted_points(t) for t in tasks), D0)
    eff = sum((effective_points(t, today) for t in tasks), D0)
    return q2(raw), q2(eff)


# --------------------------------------------------------------------------- #
# Member / project level
# --------------------------------------------------------------------------- #
def compute_baseline(values: Sequence[Decimal]) -> Decimal:
    if not values:
        return D0
    return q2(Decimal(median(values)))


def compute_expected_load(baseline: Decimal, capacity_multiplier, cfg: WorkloadConfig) -> Decimal:
    raw = baseline * clean_capacity_multiplier(capacity_multiplier)
    return q2(max(raw, cfg.min_expected_load))


def classify(total_effective_points: Decimal, expected_load: Decimal, cfg: WorkloadConfig) -> Flag:
    """The ONE definition of overloaded / underutilized. Everything else must call this."""
    if expected_load <= 0:
        # Median is 0: anyone holding work is above the bar, nobody holding none is not.
        return Flag.OVERLOADED if total_effective_points > 0 else Flag.NORMAL
    if total_effective_points > expected_load * (D1 + cfg.overload_tolerance):
        return Flag.OVERLOADED
    if total_effective_points < expected_load * cfg.underutilized_fraction:
        return Flag.UNDERUTILIZED
    return Flag.NORMAL


def compute_project_workload(
    members: Sequence[MemberInput], cfg: Optional[WorkloadConfig] = None
) -> ProjectWorkload:
    """
    Spec 2.7 steps 3-5 in one pass. Every member is judged against the SAME fresh
    baseline. Non-counted members (advisor/instructor) get a NORMAL row so their
    snapshots are rewritten (no stale OVERLOADED), but never feed the median or total.
    """
    cfg = cfg or WorkloadConfig()
    counted = [m for m in members if m.is_counted]

    if cfg.normalize_by_capacity:
        basis = [m.total_effective_points / clean_capacity_multiplier(m.capacity_multiplier) for m in counted]
    else:
        basis = [m.total_effective_points for m in counted]
    baseline = compute_baseline(basis)

    results: list[MemberResult] = []
    for m in members:
        cm = clean_capacity_multiplier(m.capacity_multiplier)
        if not m.is_counted:
            results.append(MemberResult(
                member_id=m.member_id, total_points=m.total_points,
                total_effective_points=m.total_effective_points, capacity_multiplier=cm,
                expected_load=D0, status=Flag.NORMAL, is_over_threshold=False,
                warning_suppressed=False, is_counted=False,
            ))
            continue
        expected = compute_expected_load(baseline, cm, cfg)
        status = classify(m.total_effective_points, expected, cfg)
        over = status is Flag.OVERLOADED
        results.append(MemberResult(
            member_id=m.member_id, total_points=m.total_points,
            total_effective_points=m.total_effective_points, capacity_multiplier=cm,
            expected_load=expected, status=status, is_over_threshold=over,
            warning_suppressed=over and m.silence_warning, is_counted=True,
        ))

    total = q2(sum((r.total_effective_points for r in results if r.is_counted), D0))
    return ProjectWorkload(baseline_points=baseline, members=results, total_effective_points=total)


# --------------------------------------------------------------------------- #
# Redistribution helpers (spec 4.4.1 and 5.1) with the gaps fixed
# --------------------------------------------------------------------------- #
MAX_OVERAGE_RATIO = Decimal("3")


def extension_days(
    complexity_points: int,
    base_days_per_point: int,
    total_effective_points: Decimal,
    expected_load: Decimal,
    max_ratio: Decimal = MAX_OVERAGE_RATIO,
) -> int:
    """
    ceil(points * base_days * overage_ratio). Fixes: division by zero when expected_load
    is 0 (ratio becomes max_ratio), ratio below 1 (not overloaded -> 1), and unbounded
    extensions (capped at max_ratio).
    """
    if complexity_points <= 0 or base_days_per_point <= 0:
        return 0
    if expected_load <= 0:
        ratio = max_ratio
    else:
        ratio = min(max(total_effective_points / expected_load, D1), max_ratio)
    days = Decimal(complexity_points) * Decimal(base_days_per_point) * ratio
    return int(days.to_integral_value(rounding=ROUND_CEILING))


def impact_score(
    donor_before: Decimal,
    donor_expected: Decimal,
    points_moved: Decimal,
    recipient_after: Decimal,
    recipient_expected: Decimal,
) -> Decimal:
    """
    impact = relief - recipient_penalty. Relief is capped at the donor's overage, so
    moving far more than needed is not rewarded. Negative impact -> exclude from ranking.
    """
    overage = max(D0, donor_before - donor_expected)
    relief = min(points_moved, overage)
    penalty = max(D0, recipient_after - recipient_expected)
    return relief - penalty


# --------------------------------------------------------------------------- #
# Validation (spec 2.6)
# --------------------------------------------------------------------------- #
def validate_task_deadline(
    deadline: Union[date, datetime, None],
    complexity_points: int,
    base_days_per_point: int,
    today: date,
    *,
    skip: bool = False,
) -> tuple[bool, Optional[str]]:
    """
    Minimum lead time = complexity_points * base_days_per_point days from `today`.

    Pure and synchronous: `today` is passed in, nothing is read from the clock.
    Pass skip=True for tasks that should not be checked (COMPLETED, SUBMITTED).
    Call it only on task create, or on update when the deadline or complexity changed.

    Always valid when: skip, no deadline, or 0 complexity points.
    """
    d = to_date(deadline)
    if skip or d is None:
        return True, None

    min_days_required = complexity_points * base_days_per_point
    if min_days_required <= 0:
        return True, None

    days_until_deadline = (d - today).days
    if days_until_deadline < min_days_required:
        return False, (
            f"Task deadline must be at least {min_days_required} day(s) from today "
            f"(based on {complexity_points} complexity points × {base_days_per_point} base days/point). "
            f"Got {days_until_deadline} day(s)."
        )
    return True, None