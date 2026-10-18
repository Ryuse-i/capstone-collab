"""
workload_math.py  -> app/modules/redistribution_recommendations/workload_math.py

PURE workload logic. Rules for this file:
  * No imports from app.* (no services, no models, no DB). That is what removes
    the circular import and makes everything unit-testable.
  * Nothing here calls date.today(). "today" is always passed in.
  * All money-like math is Decimal, rounded half-up to 2 places once, at the edges.

Services load data, convert it into the small dataclasses below, call
compute_project_workload(), and persist the result. Nothing else.

Eligibility: ONLY tasks that are NOT_STARTED or IN_PROGRESS count toward workload
(and therefore toward the workload balance score). Completed, submitted, cancelled,
archived, unknown and parent tasks are ignored.
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
D100 = Decimal("100")
TWO_PLACES = Decimal("0.01")
FOUR_PLACES = Decimal("0.0001")

MIN_CAPACITY_MULTIPLIER = Decimal("0.01")  # strictly positive (spec 2.5)
MAX_CAPACITY_MULTIPLIER = Decimal("2.0")   # spec 2.5
DEFAULT_CAPACITY_MULTIPLIER = D1           # spec 2.4

# Cap on the overage ratio used by extension_days and compute_load_ratio.
MAX_OVERAGE_RATIO = Decimal("3")


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


# Whitelist: the ONLY states that count toward workload.
ELIGIBLE_STATES = frozenset({TaskState.NOT_STARTED, TaskState.IN_PROGRESS})


def to_task_state(status) -> TaskState:
    """
    Map any status (Enum or string, any casing) to a TaskState.
    Only not_started / in_progress are eligible; completed, submitted,
    cancelled, archived, unknown, None -> INACTIVE.
    """
    if status is None:
        return TaskState.INACTIVE
    for candidate in (getattr(status, "name", None), getattr(status, "value", status)):
        key = str(candidate).strip().lower().replace(" ", "_").replace("-", "_")
        if key == "not_started":
            return TaskState.NOT_STARTED
        if key == "in_progress":
            return TaskState.IN_PROGRESS
    return TaskState.INACTIVE


@dataclass(frozen=True)
class WorkloadConfig:
    """Tunable decisions. Defaults reproduce the spec; change them in ONE place."""
    underutilized_fraction: Decimal = Decimal("0.3")
    # 0 = strict spec behaviour (anything above expected_load is overloaded).
    # 0.10 = must exceed expected_load by more than 10% to be flagged.
    overload_tolerance: Decimal = D0
    # Floor for expected_load. 0 = off. With the median at 0, anyone holding work is
    # OVERLOADED (spec edge case). Raise it (e.g. 2) to stop one lone task flagging.
    min_expected_load: Decimal = D0
    # False = spec (median of raw effective points). True = median of points / capacity.
    normalize_by_capacity: bool = False

    # ---- Workload balance (project-level rollup) ------------------------- #
    # MAD at or above this value = "fully unbalanced" -> spread_score 0.
    balance_spread_cutoff: Decimal = Decimal("0.5")
    # How far above 1.0 the WORST member's load ratio can go before severity_score hits 0.
    # 1.0 means a max ratio of 2.0x scores 0.
    balance_severity_span: Decimal = D1
    # Weights for the final balance score. They are divided by their sum, so they do not
    # have to add to exactly 1.
    balance_weight_spread: Decimal = Decimal("0.4")
    balance_weight_overload: Decimal = Decimal("0.3")
    balance_weight_severity: Decimal = Decimal("0.3")
    # Below this many members MAD is too noisy: the spread term is still reported but gets
    # zero weight, and the overload and severity terms share the score.
    balance_min_members_for_spread: int = 4


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
    total_effective_points: Decimal
    capacity_multiplier: Optional[Decimal] = None
    silence_warning: bool = False
    # Optional, display only. Pass the first value returned by member_totals() if you
    # want raw vs. effective points shown on the project rollup.
    total_raw_points: Optional[Decimal] = None


@dataclass(frozen=True)
class MemberResult:
    member_id: UUID
    total_effective_points: Decimal
    capacity_multiplier: Decimal
    expected_load: Decimal
    status: Flag               # TRUE status, never hidden by silence
    silence_warning: bool = False
    # total_effective_points / expected_load, rounded to 4 places.
    # 1.0 = exactly at threshold, above = overloaded, below = spare capacity.
    load_ratio: Decimal = D1
    total_raw_points: Optional[Decimal] = None


@dataclass(frozen=True)
class WorkloadBalance:
    """Project-level balance rollup. Scores are 0-100 (higher = healthier).
    When applicable is False (no members, or baseline_points is 0 because everyone's
    work is done) every score is None and the UI should show "N/A"."""
    applicable: bool = False
    # False when the team is too small for MAD to be meaningful: spread_score is still
    # reported but carries zero weight in the score.
    spread_used: bool = True
    score: Optional[Decimal] = None
    spread_score: Optional[Decimal] = None
    overload_score: Optional[Decimal] = None
    severity_score: Optional[Decimal] = None
    median_ratio: Decimal = D0
    mad: Decimal = D0
    total_members: int = 0
    overloaded_count: int = 0            # excludes silence_warning members
    overloaded_pct: Decimal = D0         # overloaded_count / total_members (0-1)
    max_load_ratio: Decimal = D0
    max_load_member_id: Optional[UUID] = None
    underutilized_member_ids: list[UUID] = field(default_factory=list)


@dataclass(frozen=True)
class ProjectWorkload:
    baseline_points: Decimal
    members: list[MemberResult] = field(default_factory=list)
    total_effective_points: Decimal = D0
    avg_points: Decimal = D0
    total_raw_points: Optional[Decimal] = None  # None when no member supplied raw points
    balance: WorkloadBalance = field(default_factory=WorkloadBalance)


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


def q4(value: Decimal) -> Decimal:
    return value.quantize(FOUR_PLACES, rounding=ROUND_HALF_UP)


def clamp01(value: Decimal) -> Decimal:
    return min(max(value, D0), D1)


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
def is_eligible(task: TaskInput) -> bool:
    """
    The ONE definition of 'this task counts toward workload'.
    Only NOT_STARTED and IN_PROGRESS leaf tasks count. Completed, submitted,
    cancelled, archived, unknown states and parent tasks never count.
    The state is normalised first, so raw strings such as "completed" are safe.
    """
    return to_task_state(task.state) in ELIGIBLE_STATES and not task.is_parent


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
    """Raw points this task adds to the member. Only eligible tasks count; else 0."""
    if not is_eligible(task):
        return D0
    return Decimal(max(task.complexity_points, 0)) * _share(task)


def effective_points(task: TaskInput, today: date) -> Decimal:
    base = counted_points(task)  # already 0 for anything not eligible
    if base == 0:
        return D0
    if to_task_state(task.state) is TaskState.NOT_STARTED:
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
    raw = baseline * capacity_multiplier
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


def compute_load_ratio(total_effective_points: Decimal, expected_load: Decimal) -> Decimal:
    """
    load_ratio = total_effective_points / expected_load

    1.0 = exactly at threshold, above 1.0 = overloaded, below 1.0 = spare capacity.
    expected_load already includes capacity_multiplier, so a 1.5x hero dev is not
    penalised for carrying more.

    expected_load <= 0 (median is 0 and no floor configured) would divide by zero:
      * holding work -> MAX_OVERAGE_RATIO (consistent with extension_days)
      * holding none -> 1.0 (nothing expected, nothing held, so exactly on threshold)
    """
    if expected_load <= 0:
        return MAX_OVERAGE_RATIO if total_effective_points > 0 else D1
    return q4(total_effective_points / expected_load)


# --------------------------------------------------------------------------- #
# Workload balance (project-level rollup)
# --------------------------------------------------------------------------- #
def compute_workload_balance(
    members: Sequence[MemberResult],
    cfg: Optional[WorkloadConfig] = None,
    baseline_points: Optional[Decimal] = None,
) -> WorkloadBalance:
    """
    Combines three 0-100 sub-scores into one workload_balance score:

      spread_score   = 100 * (1 - min(1, MAD / cutoff))          how scattered the ratios are
      overload_score = 100 * (1 - overloaded / total_members)     how many people are over
      severity_score = 100 * (1 - min(1, max(0, max_ratio-1)/span))   how bad the worst case is

      workload_balance = w_spread*spread + w_overload*overload + w_severity*severity

    Only eligible tasks (NOT_STARTED / IN_PROGRESS) feed these numbers: member points
    come from counted_points(), which ignores completed, submitted and all other states.

    Spread uses MAD (median absolute deviation) to match the median baseline: one hero
    outlier distorts a standard deviation but barely moves the MAD.

    silence_warning members:
      * INCLUDED in ratios, median, MAD, max ratio, and total_members (their data is real)
      * EXCLUDED only from overloaded_count, so a muted person does not keep nagging
    Underutilized members come from the same classify() as everywhere else
    (display only, not scored).

    Not applicable (applicable=False, every score None) when there are no members or
    baseline_points is 0 (everyone's work is done), so nothing divides by zero and the
    UI shows "N/A" instead of a misleading number.

    Small teams: below cfg.balance_min_members_for_spread members the spread term gets
    zero weight (MAD is noisy with 3-4 people) and overload + severity carry the score.
    """
    cfg = cfg or WorkloadConfig()
    n = len(members)
    if n == 0 or (baseline_points is not None and baseline_points <= 0):
        return WorkloadBalance(applicable=False, total_members=n)

    # --- spread -------------------------------------------------------------
    ratios = [m.load_ratio for m in members]
    median_ratio = Decimal(median(ratios))
    mad = Decimal(median([abs(r - median_ratio) for r in ratios]))

    cutoff = cfg.balance_spread_cutoff
    if cutoff > 0:
        spread_penalty = clamp01(mad / cutoff)
    else:  # misconfigured cutoff: any spread at all counts as fully unbalanced
        spread_penalty = D1 if mad > 0 else D0
    spread_score = D100 * (D1 - spread_penalty)

    # --- overload share -----------------------------------------------------
    overloaded = [m for m in members if m.status is Flag.OVERLOADED and not m.silence_warning]
    overloaded_pct = Decimal(len(overloaded)) / Decimal(n)
    overload_score = D100 * (D1 - overloaded_pct)

    # --- severity of the worst member --------------------------------------
    worst = max(members, key=lambda m: m.load_ratio)
    span = cfg.balance_severity_span
    over_by = max(D0, worst.load_ratio - D1)  # clamp: everyone under 1.0 must not exceed 100
    if span > 0:
        severity_penalty = clamp01(over_by / span)
    else:
        severity_penalty = D1 if over_by > 0 else D0
    severity_score = D100 * (D1 - severity_penalty)

    # --- combine ------------------------------------------------------------
    use_spread = n >= cfg.balance_min_members_for_spread
    w_spread = max(cfg.balance_weight_spread, D0) if use_spread else D0
    w_overload = max(cfg.balance_weight_overload, D0)
    w_severity = max(cfg.balance_weight_severity, D0)
    w_total = w_spread + w_overload + w_severity
    if w_total <= 0:  # misconfigured: fall back to the spec weights for the terms in play
        if use_spread:
            w_spread, w_overload, w_severity = Decimal("0.4"), Decimal("0.3"), Decimal("0.3")
        else:
            w_spread, w_overload, w_severity = D0, Decimal("0.5"), Decimal("0.5")
        w_total = D1
    score = (
        w_spread * spread_score + w_overload * overload_score + w_severity * severity_score
    ) / w_total

    return WorkloadBalance(
        applicable=True,
        spread_used=use_spread,
        score=q2(score),
        spread_score=q2(spread_score),
        overload_score=q2(overload_score),
        severity_score=q2(severity_score),
        median_ratio=q4(median_ratio),
        mad=q4(mad),
        total_members=n,
        overloaded_count=len(overloaded),
        overloaded_pct=q4(overloaded_pct),
        max_load_ratio=worst.load_ratio,
        max_load_member_id=worst.member_id,
        underutilized_member_ids=[m.member_id for m in members if m.status is Flag.UNDERUTILIZED],
    )


def compute_project_workload(
    members: Sequence[MemberInput], cfg: Optional[WorkloadConfig] = None
) -> ProjectWorkload:
    """
    Spec 2.7 steps 3-5 in one pass. Every member is judged against the SAME fresh
    baseline. Non-counted members (advisor/instructor) get a NORMAL row so their
    snapshots are rewritten (no stale OVERLOADED), but never feed the median or total.

    Member totals are expected to come from member_totals(), so they only include
    eligible (NOT_STARTED / IN_PROGRESS) tasks.

    Also rolls the per-member results up into a project-level WorkloadBalance
    (see compute_workload_balance).
    """
    cfg = cfg or WorkloadConfig()

    # get all effective points for each member
    basis = [m.total_effective_points for m in members]
    # get the baseline median for all points
    baseline = compute_baseline(basis)

    results: list[MemberResult] = []
    for m in members:
        # capacity_multiplier can be None or out of range: clean it once, use it everywhere
        cap = clean_capacity_multiplier(m.capacity_multiplier)
        # get the expected load of the member
        expected = compute_expected_load(baseline, cap, cfg)
        # checks the status by comparing the total_points towards the expected points
        status = classify(m.total_effective_points, expected, cfg)
        # points / expected load, the input to the balance score
        ratio = compute_load_ratio(m.total_effective_points, expected)
        results.append(MemberResult(
            member_id=m.member_id,
            total_effective_points=m.total_effective_points,
            capacity_multiplier=cap,
            expected_load=expected,
            status=status,
            silence_warning=m.silence_warning,
            load_ratio=ratio,
            total_raw_points=m.total_raw_points,
        ))

    # gets the total project workload points
    total = q2(sum((r.total_effective_points for r in results), D0))

    # raw total is display only; None unless at least one member supplied it
    raw_values = [r.total_raw_points for r in results if r.total_raw_points is not None]
    total_raw = q2(sum(raw_values, D0)) if raw_values else None

    return ProjectWorkload(
        baseline_points=baseline,
        members=results,
        total_effective_points=total,
        avg_points=baseline,
        total_raw_points=total_raw,
        balance=compute_workload_balance(results, cfg, baseline_points=baseline),
    )


# --------------------------------------------------------------------------- #
# Redistribution helpers (spec 4.4.1 and 5.1) with the gaps fixed
# --------------------------------------------------------------------------- #
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