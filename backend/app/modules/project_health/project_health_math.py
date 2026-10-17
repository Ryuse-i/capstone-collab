"""
project_health_math.py  -> app/modules/redistribution_recommendations/project_health_math.py
(put it next to workload_math.py)

PURE project-health logic. Same rules as workload_math.py:
  * No imports from app.* (no services, no models, no DB). The only sibling import is
    workload_math, which is itself pure.
  * Nothing here calls date.today(). "today" is always passed in.
  * Decimal everywhere, rounded half-up once, at the edges.
  * Purely diagnostic: nothing in here recommends or triggers an action.

Services load tasks and project data, map them into HealthTask, call
compute_project_health(), and persist or return the result.

Project Health = weighted blend of four 0-100 sub-scores:
    schedule (0.35) + workload balance (0.30) + risk (0.25) + activity (0.10)
A sub-score that is N/A (None) is dropped and the remaining weights are renormalised,
so a missing component never counts as 0 or as 100. Status bands then get two
override rules so an average cannot hide a serious problem.

Health describes the project as it is NOW. Nothing is measured against a project-level
start or end date (those objectives are often unrealistic). Task deadlines still count:
overdue rate and SPI are about individual tasks, not the project objective.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Optional, Sequence, Union

from ..redistribution_recommendations.workload_math import D0, D1, D100, WorkloadBalance, q2, q4, to_date

DateLike = Union[date, datetime, None]


# --------------------------------------------------------------------------- #
# Types
# --------------------------------------------------------------------------- #
class ScheduleState(str, Enum):
    """Task state as the schedule metrics see it. The service maps its own statuses:
    COMPLETED (and SUBMITTED, if you count it as done) -> COMPLETED;
    cancelled / archived / unknown -> EXCLUDED (ignored everywhere)."""
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    EXCLUDED = "excluded"


class HealthStatus(str, Enum):
    HEALTHY = "healthy"
    WATCH = "watch"
    AT_RISK = "at_risk"


_SEVERITY = {HealthStatus.HEALTHY: 0, HealthStatus.WATCH: 1, HealthStatus.AT_RISK: 2}


def _worse(a: HealthStatus, b: HealthStatus) -> HealthStatus:
    return a if _SEVERITY[a] >= _SEVERITY[b] else b


@dataclass(frozen=True)
class HealthConfig:
    """Tunable decisions. Defaults reproduce the spec; change them in ONE place
    (or load project-level overrides into one of these)."""
    # ---- schedule ------------------------------------------------------- #
    at_risk_days: int = 7               # Not Started and due in 0..N days
    schedule_weight_spi: Decimal = Decimal("0.4")
    schedule_weight_overdue: Decimal = Decimal("0.3")
    schedule_weight_at_risk: Decimal = Decimal("0.3")
    # ---- risk & coverage ------------------------------------------------ #
    chronic_penalty: Decimal = Decimal("25")   # per chronic-overload member
    chronic_cap: int = 2                       # members beyond this add no penalty
    spof_penalty: Decimal = Decimal("30")      # times spof_rate (0-1)
    unassigned_penalty: Decimal = Decimal("20")  # times unassigned_rate (0-1)
    # ---- activity ------------------------------------------------------- #
    stale_days: int = 7                 # In Progress with no update for N+ days
    recent_completion_days: int = 7
    # ---- composite ------------------------------------------------------ #
    weight_schedule: Decimal = Decimal("0.35")
    weight_balance: Decimal = Decimal("0.30")
    weight_risk: Decimal = Decimal("0.25")
    weight_activity: Decimal = Decimal("0.10")
    healthy_threshold: Decimal = Decimal("80")   # >= this: Healthy
    watch_threshold: Decimal = Decimal("60")     # >= this: Watch, below: At Risk
    # Overdue rate strictly above this forces At Risk regardless of score.
    overdue_override_rate: Decimal = Decimal("0.30")


@dataclass(frozen=True)
class HealthTask:
    state: ScheduleState
    complexity_points: int
    deadline: DateLike = None
    completed_at: DateLike = None       # needed for recent completions
    updated_at: DateLike = None         # needed for stale detection (None = not judged stale)
    assigned: bool = True               # False = no assigned_to
    extension_count: int = 0            # Move Deadline applications on this task
    # Members who pass the eligibility rule (3.1) for this task. None = not computed.
    eligible_member_count: Optional[int] = None
    is_parent: bool = False             # supertask whose subtasks are tracked separately


@dataclass(frozen=True)
class ScheduleMetrics:
    applicable: bool = False            # False when the project has no live tasks
    score: Optional[Decimal] = None
    open_tasks: int = 0
    overdue_tasks: int = 0
    overdue_rate: Decimal = D0          # overdue open tasks / open tasks (0-1)
    at_risk_tasks: int = 0
    at_risk_rate: Decimal = D0          # Not Started due in 0..at_risk_days / open tasks (0-1)
    total_points: Decimal = D0
    completed_points: Decimal = D0
    remaining_points: Decimal = D0
    completion_pct: Optional[Decimal] = None   # points-weighted, 0-100
    planned_points: Decimal = D0        # points of tasks whose deadline <= today
    earned_points: Decimal = D0         # ...of which are completed
    spi: Optional[Decimal] = None       # earned / planned; None when nothing was planned yet
    extension_count: int = 0


@dataclass(frozen=True)
class RiskMetrics:
    score: Decimal = D100
    chronic_count: int = 0
    open_tasks: int = 0
    unassigned_count: int = 0
    unassigned_rate: Decimal = D0       # 0-1, over open tasks
    spof_count: int = 0
    spof_rate: Optional[Decimal] = None  # 0-1; None when no open task had eligibility computed
    no_eligible_recipient_rate: Optional[Decimal] = None  # passed through for display


@dataclass(frozen=True)
class ActivityMetrics:
    applicable: bool = False            # False when nothing is In Progress
    score: Optional[Decimal] = None
    in_progress_tasks: int = 0
    stale_in_progress: int = 0
    recent_completions: int = 0


@dataclass(frozen=True)
class ProjectHealth:
    score: Optional[Decimal]                    # None only if every component were N/A
    status: HealthStatus                        # after override rules
    base_status: HealthStatus                   # from the score alone
    overrides_applied: list[str] = field(default_factory=list)
    # Always show these next to the headline number. None = N/A.
    schedule_score: Optional[Decimal] = None
    workload_balance_score: Optional[Decimal] = None
    risk_score: Optional[Decimal] = None
    activity_score: Optional[Decimal] = None
    weights_used: dict[str, Decimal] = field(default_factory=dict)  # after renormalising
    schedule: ScheduleMetrics = field(default_factory=ScheduleMetrics)
    risk: RiskMetrics = field(default_factory=RiskMetrics)
    activity: ActivityMetrics = field(default_factory=ActivityMetrics)
    balance: WorkloadBalance = field(default_factory=WorkloadBalance)


# --------------------------------------------------------------------------- #
# Small helpers
# --------------------------------------------------------------------------- #
def _live(tasks: Sequence[HealthTask]) -> list[HealthTask]:
    """Tasks that count: not excluded and not a parent (parents would double count)."""
    return [t for t in tasks if t.state is not ScheduleState.EXCLUDED and not t.is_parent]


def _points(task: HealthTask) -> Decimal:
    return Decimal(max(task.complexity_points, 0))


def _is_open(task: HealthTask) -> bool:
    return task.state in (ScheduleState.NOT_STARTED, ScheduleState.IN_PROGRESS)


def _days_to_deadline(task: HealthTask, today: date) -> Optional[int]:
    d = to_date(task.deadline)
    return None if d is None else (d - today).days  # negative = overdue


def _rate(numerator: int, denominator: int) -> Decimal:
    """0-1 fraction; an empty denominator is 0, never a division error."""
    if denominator <= 0:
        return D0
    return q4(Decimal(numerator) / Decimal(denominator))


def _normalised(weights: dict[str, Decimal]) -> dict[str, Decimal]:
    total = sum(weights.values(), D0)
    if total <= 0:
        return {}
    return {k: v / total for k, v in weights.items()}


# --------------------------------------------------------------------------- #
# 2. Schedule tracking
# --------------------------------------------------------------------------- #
def compute_schedule_metrics(
    tasks: Sequence[HealthTask],
    today: date,
    cfg: Optional[HealthConfig] = None,
) -> ScheduleMetrics:
    """
    overdue rate   = open tasks past their deadline / open tasks
    at-risk rate   = Not Started tasks due in 0..at_risk_days / open tasks
                     (overdue tasks are NOT also counted here, so nothing is double counted)
    completion %   = completed points / total points (points-weighted, not task count)
    SPI            = earned / planned, where planned = points of tasks with deadline <= today
                     and earned = the completed ones among them. 1.0 = on track, < 1 = behind.
    schedule score = 100 * (w_spi*min(1, SPI) + w_overdue*(1 - overdue_rate)
                            + w_at_risk*(1 - at_risk_rate)), weights renormalised.
                     SPI is treated as 1.0 when nothing has been planned yet.
    """
    cfg = cfg or HealthConfig()
    live = _live(tasks)
    if not live:
        return ScheduleMetrics(applicable=False)

    open_tasks = [t for t in live if _is_open(t)]
    done = [t for t in live if t.state is ScheduleState.COMPLETED]

    overdue = [t for t in open_tasks if (_days_to_deadline(t, today) or 0) < 0]
    at_risk = []
    for t in open_tasks:
        days = _days_to_deadline(t, today)
        if t.state is ScheduleState.NOT_STARTED and days is not None and 0 <= days <= cfg.at_risk_days:
            at_risk.append(t)
    overdue_rate = _rate(len(overdue), len(open_tasks))
    at_risk_rate = _rate(len(at_risk), len(open_tasks))

    # points-weighted completion
    completed_points = sum((_points(t) for t in done), D0)
    remaining_points = sum((_points(t) for t in open_tasks), D0)
    total_points = completed_points + remaining_points
    completion_pct = q2(completed_points / total_points * D100) if total_points > 0 else None

    # SPI
    planned = [t for t in live if (_days_to_deadline(t, today) is not None
                                   and _days_to_deadline(t, today) <= 0)]
    planned_points = sum((_points(t) for t in planned), D0)
    earned_points = sum((_points(t) for t in planned if t.state is ScheduleState.COMPLETED), D0)
    spi = q4(earned_points / planned_points) if planned_points > 0 else None

    # score
    weights = _normalised({
        "spi": max(cfg.schedule_weight_spi, D0),
        "overdue": max(cfg.schedule_weight_overdue, D0),
        "at_risk": max(cfg.schedule_weight_at_risk, D0),
    })
    spi_for_score = min(D1, spi) if spi is not None else D1
    score = D100 * (
        weights.get("spi", D0) * spi_for_score
        + weights.get("overdue", D0) * (D1 - overdue_rate)
        + weights.get("at_risk", D0) * (D1 - at_risk_rate)
    )

    return ScheduleMetrics(
        applicable=True,
        score=q2(score),
        open_tasks=len(open_tasks),
        overdue_tasks=len(overdue),
        overdue_rate=overdue_rate,
        at_risk_tasks=len(at_risk),
        at_risk_rate=at_risk_rate,
        total_points=q2(total_points),
        completed_points=q2(completed_points),
        remaining_points=q2(remaining_points),
        completion_pct=completion_pct,
        planned_points=q2(planned_points),
        earned_points=q2(earned_points),
        spi=spi,
        extension_count=sum(max(t.extension_count, 0) for t in live),
    )


# --------------------------------------------------------------------------- #
# 3. Risk & coverage
# --------------------------------------------------------------------------- #
def compute_risk_metrics(
    tasks: Sequence[HealthTask],
    chronic_overload_count: int = 0,
    no_eligible_recipient_rate: Optional[Decimal] = None,
    cfg: Optional[HealthConfig] = None,
) -> RiskMetrics:
    """
    risk_score = 100 - chronic_penalty * min(chronic_count, cap)
                     - spof_penalty * spof_rate
                     - unassigned_penalty * unassigned_rate        (floored at 0)
    Rates are 0-1 fractions, so the worst case of each term is exactly its penalty.

    Single point of failure = an open task with 0 or 1 eligible members (if that one person
    is unavailable nobody can take over; 0 is the same problem, only worse). The rate is
    taken over open tasks whose eligible_member_count was computed; None when there are none.
    no_eligible_recipient_rate is supplied by the service (fallback rule 3.3), shown only.
    """
    cfg = cfg or HealthConfig()
    open_tasks = [t for t in _live(tasks) if _is_open(t)]

    unassigned = [t for t in open_tasks if not t.assigned]
    unassigned_rate = _rate(len(unassigned), len(open_tasks))

    known = [t for t in open_tasks if t.eligible_member_count is not None]
    spof = [t for t in known if t.eligible_member_count <= 1]
    spof_rate = _rate(len(spof), len(known)) if known else None

    chronic_count = max(chronic_overload_count, 0)
    score = (
        D100
        - cfg.chronic_penalty * Decimal(min(chronic_count, max(cfg.chronic_cap, 0)))
        - cfg.spof_penalty * (spof_rate if spof_rate is not None else D0)
        - cfg.unassigned_penalty * unassigned_rate
    )
    score = min(D100, max(D0, score))

    return RiskMetrics(
        score=q2(score),
        chronic_count=chronic_count,
        open_tasks=len(open_tasks),
        unassigned_count=len(unassigned),
        unassigned_rate=unassigned_rate,
        spof_count=len(spof),
        spof_rate=spof_rate,
        no_eligible_recipient_rate=no_eligible_recipient_rate,
    )


# --------------------------------------------------------------------------- #
# 4. Activity / momentum
# --------------------------------------------------------------------------- #
def compute_activity_metrics(
    tasks: Sequence[HealthTask], today: date, cfg: Optional[HealthConfig] = None
) -> ActivityMetrics:
    """
    activity_score = 100 * (1 - stale_in_progress / total_in_progress)
    Stale = In Progress and last updated stale_days or more ago. A task with no
    updated_at is not judged stale (no evidence either way). N/A when nothing is In Progress.
    """
    cfg = cfg or HealthConfig()
    live = _live(tasks)
    in_progress = [t for t in live if t.state is ScheduleState.IN_PROGRESS]

    stale = 0
    for t in in_progress:
        u = to_date(t.updated_at)
        if u is not None and (today - u).days >= cfg.stale_days:
            stale += 1

    recent = 0
    for t in live:
        c = to_date(t.completed_at)
        if t.state is ScheduleState.COMPLETED and c is not None and 0 <= (today - c).days < cfg.recent_completion_days:
            recent += 1

    if not in_progress:
        return ActivityMetrics(applicable=False, recent_completions=recent)

    score = D100 * (D1 - Decimal(stale) / Decimal(len(in_progress)))
    return ActivityMetrics(
        applicable=True,
        score=q2(score),
        in_progress_tasks=len(in_progress),
        stale_in_progress=stale,
        recent_completions=recent,
    )


# --------------------------------------------------------------------------- #
# Composite
# --------------------------------------------------------------------------- #
def status_from_score(score: Decimal, cfg: HealthConfig) -> HealthStatus:
    if score >= cfg.healthy_threshold:
        return HealthStatus.HEALTHY
    if score >= cfg.watch_threshold:
        return HealthStatus.WATCH
    return HealthStatus.AT_RISK


def compute_project_health(
    *,
    tasks: Sequence[HealthTask],
    today: date,
    balance: WorkloadBalance,
    chronic_overload_count: int = 0,
    chronic_escalation_active: bool = False,
    no_eligible_recipient_rate: Optional[Decimal] = None,
    cfg: Optional[HealthConfig] = None,
) -> ProjectHealth:
    """
    project_health = 0.35*schedule + 0.30*workload_balance + 0.25*risk + 0.10*activity
    Components that are N/A are dropped and the other weights renormalised.

    Bands: >= 80 Healthy, 60-79 Watch, < 60 At Risk. Override rules (they can only make
    the status worse, never better), recorded in overrides_applied when they change it:
      * chronic_escalation     any active chronic-overload escalation  -> at least Watch
      * overdue_rate           overdue rate above the threshold (30%)  -> At Risk

    `balance` is the WorkloadBalance from workload_math (project_workload.balance).
    """
    cfg = cfg or HealthConfig()

    schedule = compute_schedule_metrics(tasks, today, cfg)
    risk = compute_risk_metrics(tasks, chronic_overload_count, no_eligible_recipient_rate, cfg)
    activity = compute_activity_metrics(tasks, today, cfg)

    components: dict[str, tuple[Decimal, Decimal]] = {}  # name -> (weight, score)
    if schedule.score is not None:
        components["schedule"] = (max(cfg.weight_schedule, D0), schedule.score)
    if balance.applicable and balance.score is not None:
        components["workload_balance"] = (max(cfg.weight_balance, D0), balance.score)
    components["risk"] = (max(cfg.weight_risk, D0), risk.score)
    if activity.score is not None:
        components["activity"] = (max(cfg.weight_activity, D0), activity.score)

    weights = _normalised({name: w for name, (w, _) in components.items()})
    score: Optional[Decimal] = None
    if weights:
        score = q2(sum((weights[name] * s for name, (_, s) in components.items()), D0))

    base_status = status_from_score(score, cfg) if score is not None else HealthStatus.AT_RISK
    status = base_status
    overrides: list[str] = []

    def apply(name: str, floor: HealthStatus) -> None:
        nonlocal status
        worse = _worse(status, floor)
        if worse is not status:
            status = worse
            overrides.append(name)

    if chronic_escalation_active:
        apply("chronic_escalation", HealthStatus.WATCH)
    if schedule.overdue_rate > cfg.overdue_override_rate:
        apply("overdue_rate", HealthStatus.AT_RISK)

    return ProjectHealth(
        score=score,
        status=status,
        base_status=base_status,
        overrides_applied=overrides,
        schedule_score=schedule.score,
        workload_balance_score=balance.score if balance.applicable else None,
        risk_score=risk.score,
        activity_score=activity.score,
        weights_used={k: q4(v) for k, v in weights.items()},
        schedule=schedule,
        risk=risk,
        activity=activity,
        balance=balance,
    )