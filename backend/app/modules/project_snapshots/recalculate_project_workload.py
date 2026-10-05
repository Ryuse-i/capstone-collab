"""
Sketch: full-project workload recalculation (spec Section 2.7 / Section 6, step 1).

Two parts, following the rule "calculation in workload_calculation.py,
services only read/persist":

  PART 1 -> goes in  app/modules/redistribution_recommendations/workload_calculation.py
            Pure functions. No DB, no I/O. Easy to unit test.

  PART 2 -> goes in  app/modules/member_snapshots/services.py (or wherever you
            want the orchestrator). Reads from services, calls Part 1, persists.

Names marked  # ASSUMPTION  are guesses about your schema/services; adjust them.
"""

# =============================================================================
# PART 1: workload_calculation.py (pure logic)
# =============================================================================
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from enum import Enum
from statistics import median
from typing import Sequence
from uuid import UUID
from app.modules.projects.services import ProjectService
from app.modules.project_members.services import ProjectMemberService
from app.modules.member_snapshots.services import MemberSnapshotService
from app.modules.project_snapshots.services import ProjectSnapshotService
from app.modules.member_snapshots.schema import MemberSnapshotUpsert
from app.modules.project_snapshots.schema import ProjectSnapshotUpsert
from app.modules.redistribution_recommendations.workload_calculation import calculate_member_workload_totals

def round_half_up_int(value):
    return int(Decimal(str(value)).quantize(Decimal("1"), rounding=ROUND_HALF_UP))

TWO_PLACES = Decimal("0.01")
UNDERUTILIZED_FRACTION = Decimal("0.8")   # you already have this constant; reuse yours
MAX_CAPACITY_MULTIPLIER = Decimal("2.0")  # spec 2.5


class WorkloadStatus(str, Enum):
    # ASSUMPTION: use your real enum instead of this one.
    UNDERUTILIZED = "underutilized"
    BALANCED = "balanced"
    OVERLOADED = "overloaded"


@dataclass(frozen=True)
class MemberWorkloadInput:
    """One member's already-computed totals plus the settings that shape their threshold."""
    member_id: UUID
    total_points: Decimal             # raw complexity points (dashboard only)
    total_effective_points: Decimal   # deadline-weighted (drives overload)
    capacity_multiplier: Decimal
    silence_warning: bool


@dataclass(frozen=True)
class MemberWorkloadResult:
    """Everything the persistence layer needs for one member."""
    member_id: UUID
    total_points: Decimal
    total_effective_points: Decimal
    expected_load: Decimal
    status: WorkloadStatus
    is_over_threshold: bool           # true even when silenced, so data is never hidden


def to_decimal_2(value) -> Decimal:
    """Convert a float/int/Decimal to a Decimal rounded half-up to 2 places."""
    return Decimal(str(value)).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


def clamp_capacity_multiplier(value: Decimal) -> Decimal:
    """
    Keep capacity_multiplier inside the spec range (0, 2.0].
    There is no lower floor, but it must be strictly positive, so a bad value
    falls back to the default of 1.0 instead of producing expected_load <= 0.
    """
    if value is None or value <= 0:
        return Decimal("1.0")
    return min(value, MAX_CAPACITY_MULTIPLIER)


def compute_baseline_points(totals: Sequence[Decimal]) -> Decimal:
    """
    Baseline = MEDIAN of every counted member's total_effective_points (spec 2.3).
    Members with no tasks must be included as 0, otherwise the median is inflated.
    """
    if not totals:
        return Decimal("0")
    return to_decimal_2(median(totals))


def compute_expected_load(baseline: Decimal, capacity_multiplier: Decimal) -> Decimal:
    """expected_load = baseline_points * capacity_multiplier (spec 2.4)."""
    return to_decimal_2(baseline * clamp_capacity_multiplier(capacity_multiplier))


def determine_member_status(
    total_effective_points: Decimal,
    expected_load: Decimal,
    silence_warning: bool,
) -> WorkloadStatus:
    """
    Classify one member against their own expected_load.

    - OVERLOADED:     total_effective_points > expected_load (suppressed by silence_warning)
    - UNDERUTILIZED:  total_effective_points < expected_load * 0.8
    - BALANCED:       everything else

    If expected_load <= 0 (median is 0, e.g. most members idle) the comparison is
    meaningless and would flag anyone holding a single task, so we return BALANCED.
    Swap this for your existing determine_workload_status if it covers the same rules.
    """
    if expected_load <= 0:
        return WorkloadStatus.BALANCED
    if total_effective_points > expected_load:
        return WorkloadStatus.BALANCED if silence_warning else WorkloadStatus.OVERLOADED
    if total_effective_points < expected_load * UNDERUTILIZED_FRACTION:
        return WorkloadStatus.UNDERUTILIZED
    return WorkloadStatus.BALANCED


def compute_project_workload(
    members: Sequence[MemberWorkloadInput],
) -> list[MemberWorkloadResult]:
    """
    Full pass over one project's counted members (spec 2.7, steps 3-5):
    median baseline -> per-member expected_load -> status.

    Every member is evaluated against the SAME fresh baseline, so a change to one
    member's total correctly shifts everyone else's threshold.
    """
    baseline = compute_baseline_points([m.total_effective_points for m in members])

    results: list[MemberWorkloadResult] = []
    for m in members:
        expected = compute_expected_load(baseline, m.capacity_multiplier)
        status = determine_member_status(
            m.total_effective_points, expected, m.silence_warning
        )
        results.append(
            MemberWorkloadResult(
                member_id=m.member_id,
                total_points=m.total_points,
                total_effective_points=m.total_effective_points,
                expected_load=expected,
                status=status,
                is_over_threshold=(expected > 0 and m.total_effective_points > expected),
            )
        )
    return results


def compute_project_total(results: Sequence[MemberWorkloadResult]) -> Decimal:
    """
    Project total = sum of the members' latest effective points.
    Computed from scratch each pass (no delta), so rounding never accumulates and
    a missing/stale previous snapshot can't corrupt it.
    """
    return sum((r.total_effective_points for r in results), Decimal("0"))


# =============================================================================
# PART 2: services (read -> call Part 1 -> persist)
# =============================================================================
# ASSUMPTION: adjust these imports to your real module paths.
# from app.modules.project_members.services import ProjectMemberService
# from app.modules.projects.services import ProjectService
# from app.modules.project_snapshots.services import ProjectSnapshotService
# from app.modules.member_snapshots.services import MemberSnapshotService
# from app.modules.redistribution_recommendations.workload_calculation import (
#     calculate_member_workload_totals, ...
# )

COUNTED_ROLES = {"LEADER", "MEMBER"}  # ASSUMPTION: use your ProjectRole enum; ADVISOR/INSTRUCTOR excluded


async def recalculate_project_workload(db, project_id: UUID):
    """
    Recompute workload state for EVERY counted member of a project, then persist.

    Steps:
      1. Load counted members (LEADER/MEMBER only).
      2. Compute each member's raw + effective totals (existing function).
      3. Run the pure pass: median baseline, expected_load, status.
      4. Upsert each member's snapshot and the project snapshot (sum of members).
      5. Commit once so the whole pass is atomic.

    Call this from anything that changes workload: task create/update/delete,
    assignment changes, SUBMITTED/rejected transitions, capacity_multiplier or
    silence_warning edits, and a daily job (urgency multipliers change with time).

    Deadline validation is intentionally NOT run here. It belongs at task
    create/update time (spec 2.6), not on every recalculation.
    """
    project = await ProjectService.get_one_project(db, project_id)
    if project is None:
        return []

    # ASSUMPTION: a method that lists a project's members with role,
    # capacity_multiplier and silence_warning available on the row.
    project_members = await ProjectMemberService.get_project_members(db, project_id)
    counted = [pm for pm in project_members if pm.role in COUNTED_ROLES]

    inputs: list[MemberWorkloadInput] = []
    for pm in counted:
        # Members with no tasks return (0, 0), so they still count in the median.
        total_points, total_effective = await calculate_member_workload_totals(db, pm.id)
        inputs.append(
            MemberWorkloadInput(
                member_id=pm.id,  # ASSUMPTION: same id your existing code calls member_id
                total_points=to_decimal_2(total_points),
                total_effective_points=to_decimal_2(total_effective),
                capacity_multiplier=Decimal(str(pm.capacity_multiplier)),
                silence_warning=bool(pm.silence_warning),
            )
        )

    results = compute_project_workload(inputs)

    # Persist members. Every counted member is rewritten, so none keep a stale value
    # feeding the next median.
    for r in results:
        await MemberSnapshotService.upsert_today_member_snapshot(
            db,
            r.member_id,
            MemberSnapshotUpsert(
                total_effective_points=r.total_effective_points,
                workload_status=r.status,
            ),
        )

    # Persist project total once, rounded once, computed from scratch.
    await ProjectSnapshotService.upsert_today_snapshot(
        db,
        project_id,
        ProjectSnapshotUpsert(
            total_workload_points=round_half_up_int(compute_project_total(results))
        ),
    )

    await db.commit()  # NOTE: remove if your upsert helpers already commit (see notes)
    return results