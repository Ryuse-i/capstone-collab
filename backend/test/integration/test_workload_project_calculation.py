"""
Unit tests for the workload ORCHESTRATOR (ProjectSnapshotService.calculate_project_workload)
and its task-loading / role helpers.

Replaces the old mocked tests for recompute_workload_state, calculate_member_workload_totals,
is_working_member and create_or_update_member_snapshots. The math itself is tested in
test_workload_math.py; here we only test that the service:
  * reads tasks/members and converts them correctly,
  * calls the pure pass once,
  * persists EVERY member and the project total with the right values,
  * uses the Manila date, locks the project, and commits only when asked.

Requires: pytest, pytest-asyncio, freezegun (>=1.3)
"""

import pytest
from datetime import date
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

from freezegun import freeze_time

from app.modules.project_snapshots.services import (
    ProjectSnapshotService,
    _load_task_inputs,
    app_today,
    is_counted_member,
)
from app.modules.redistribution_recommendations import workload_math as wm
from app.modules.tasks.enums import Status as TaskStatus, Complexity
from app.modules.project_members.model import ProjectRole
from app.modules.member_snapshots.model import MemberStatus

D = Decimal
MODULE = "app.modules.project_snapshots.services"
ASSIGNED_SERVICE = "app.modules.assigned_members.services.AssignedMemberService"
TASK_SERVICE = "app.modules.tasks.services.TaskService"


# --------------------------------------------------------------------------- #
# Fixtures / helpers
# --------------------------------------------------------------------------- #

@pytest.fixture(autouse=True)
def frozen_today():
    """Freeze the clock so deadline-boundary tests can't flake around midnight.
    2026-09-21 00:00 UTC is 08:00 in Manila, so the Manila date is also 2026-09-21."""
    with freeze_time("2026-09-21", real_asyncio=True):
        yield


TODAY = date(2026, 9, 21)


def days_from_today(n: int) -> date:
    return date.fromordinal(TODAY.toordinal() + n)


def make_task(status, complexity, days=None, has_subtasks=False, deleted=False):
    """
    Task stand-in. SimpleNamespace (not MagicMock) on purpose: the service reads optional
    attributes with getattr(x, name, default), and a MagicMock would return a truthy
    MagicMock for every missing attribute (e.g. it would look soft-deleted).
    """
    return SimpleNamespace(
        id=uuid4(),
        status=status,
        complexity=complexity,
        deadline=None if days is None else days_from_today(days),
        has_subtasks=has_subtasks,
        deleted_at=date(2026, 9, 1) if deleted else None,
    )


def make_assignment(task, effort_share=None):
    return SimpleNamespace(task_id=task.id, effort_share=effort_share)


def make_member(role=None, capacity=None, silence=False):
    return SimpleNamespace(
        id=uuid4(),
        project_role=role,           # None is treated as MEMBER per spec
        capacity_multiplier=capacity,
        silence_warning=silence,
    )


def patch_workload(monkeypatch, members, tasks_by_member=None):
    """
    Patch everything calculate_project_workload touches.

    tasks_by_member maps member.id -> list of tasks, or of (task, effort_share) tuples.
    Returns a namespace with the mocks so tests can assert on what was persisted.
    The *Upsert schemas are replaced by `lambda **kw: kw`, so persisted payloads arrive as
    plain dicts and the assertions do not depend on the pydantic schema.
    """
    tasks_by_member = tasks_by_member or {}
    all_tasks = {}
    assignments = {}
    # Also track task_id -> list of assigned members for get_task_members mock
    # We need to calculate the number of members based on the effort_share in the test data
    # effort_share = 1 / member_count, so member_count = 1 / effort_share
    task_assigned_members = {}
    for member_id, entries in tasks_by_member.items():
        rows = []
        for entry in entries:
            task, share = entry if isinstance(entry, tuple) else (entry, None)
            all_tasks[task.id] = task
            # Build assignment rows
            rows.append(make_assignment(task, share))
            # Calculate how many members should be assigned to this task based on share
            # If share is None, treat as 1.0 (full task)
            # member_count = 1 / share
            if share is None:
                member_count = 1
            else:
                # Handle the case where share might be 0 (though it shouldn't be in valid data)
                if share == 0:
                    member_count = 1  # fallback to avoid division by zero
                else:
                    member_count = max(1, int(round(1 / share)))
            # Track which members are assigned to each task for get_task_members mock
            if task.id not in task_assigned_members:
                task_assigned_members[task.id] = []
            # Add the calculated number of members
            task_assigned_members[task.id].extend([make_member() for _ in range(member_count)])
        assignments[member_id] = rows

    lock = AsyncMock()
    member_upsert = AsyncMock()
    project_upsert = AsyncMock()

    monkeypatch.setattr(f"{MODULE}._lock_project", lock)
    monkeypatch.setattr(
        f"{MODULE}.ProjectMemberService.get_all_members_by_project", AsyncMock(return_value=members)
    )
    monkeypatch.setattr(
        f"{ASSIGNED_SERVICE}.get_members",
        AsyncMock(side_effect=lambda db, member_id: assignments.get(member_id, [])),
    )
    monkeypatch.setattr(
        f"{ASSIGNED_SERVICE}.get_task_members",
        AsyncMock(side_effect=lambda db, task_id: task_assigned_members.get(task_id, [])),
    )
    monkeypatch.setattr(
        f"{TASK_SERVICE}.batch_get_task",
        AsyncMock(side_effect=lambda db, ids: [all_tasks[i] for i in ids if i in all_tasks]),
    )
    monkeypatch.setattr(f"{MODULE}.MemberSnapshotService.upsert_today_member_snapshot", member_upsert)
    monkeypatch.setattr(ProjectSnapshotService, "upsert_today_snapshot", project_upsert)
    monkeypatch.setattr(f"{MODULE}.MemberSnapshotUpsert", lambda **kw: kw)
    monkeypatch.setattr(f"{MODULE}.ProjectSnapshotUpsert", lambda **kw: kw)

    return SimpleNamespace(lock=lock, member_upsert=member_upsert, project_upsert=project_upsert)


def persisted_by_member(mocks):
    """member_id -> the dict that was handed to upsert_today_member_snapshot."""
    return {call.args[1]: call.args[2] for call in mocks.member_upsert.await_args_list}


def persisted_project_total(mocks):
    return mocks.project_upsert.await_args.args[2]["total_workload_points"]


# --------------------------------------------------------------------------- #
# Roles (replaces TestIsWorkingMember)
# --------------------------------------------------------------------------- #

class TestIsCountedMember:
    @pytest.mark.parametrize(
        "role, expected",
        [
            (ProjectRole.LEADER, True),
            (ProjectRole.MEMBER, True),
            (None, True),  # None is treated as MEMBER
            (ProjectRole.ADVISOR, False),
            (ProjectRole.INSTRUCTOR, False),
        ],
    )
    def test_is_counted_member(self, role, expected):
        assert is_counted_member(make_member(role)) is expected


# --------------------------------------------------------------------------- #
# Manila date (replaces the server-local date.today())
# --------------------------------------------------------------------------- #

class TestAppToday:
    def test_uses_manila_date_not_utc(self):
        # 17:00 UTC on the 21st is already 01:00 on the 22nd in Manila
        with freeze_time("2026-09-21 17:00:00"):
            assert app_today() == date(2026, 9, 22)

    def test_same_day_before_the_utc_offset_rolls_over(self):
        with freeze_time("2026-09-21 15:59:00"):   # 23:59 Manila
            assert app_today() == date(2026, 9, 21)


# --------------------------------------------------------------------------- #
# Task loading (replaces calculate_member_workload_totals / get_member_tasks tests)
# --------------------------------------------------------------------------- #

class TestLoadTaskInputs:
    @pytest.mark.asyncio
    async def test_status_mapping_whitelists_only_open_work(self, monkeypatch):
        member = make_member()
        tasks = [
            make_task(TaskStatus.NOT_STARTED, Complexity.MEDIUM, 1),
            make_task(None, Complexity.MEDIUM, 1),                      # no status = not started
            make_task(TaskStatus.IN_PROGRESS, Complexity.HIGH, 1),
            make_task(TaskStatus.COMPLETED, Complexity.LOW, 1),
            make_task(TaskStatus.SUBMITTED, Complexity.HIGH, 1),
            make_task("CANCELLED", Complexity.HIGH, 1),                 # unknown status must not count
        ]
        patch_workload(monkeypatch, [member], {member.id: tasks})

        inputs = await _load_task_inputs(AsyncMock(), member.id)

        assert [i.state for i in inputs] == [
            wm.TaskState.NOT_STARTED,
            wm.TaskState.NOT_STARTED,
            wm.TaskState.IN_PROGRESS,
            wm.TaskState.INACTIVE,
            wm.TaskState.INACTIVE,
            wm.TaskState.INACTIVE,
        ]

    @pytest.mark.asyncio
    async def test_complexity_deadline_share_and_parent_flag_are_carried(self, monkeypatch):
        member = make_member()
        plain = make_task(TaskStatus.NOT_STARTED, Complexity.HIGH, 5)
        shared = make_task(TaskStatus.IN_PROGRESS, Complexity.MEDIUM, None)
        parent = make_task(TaskStatus.IN_PROGRESS, Complexity.HIGH, None, has_subtasks=True)
        no_complexity = make_task(TaskStatus.NOT_STARTED, None, 5)
        patch_workload(
            monkeypatch, [member],
            {member.id: [plain, (shared, D("0.5")), parent, no_complexity]},
        )

        plain_in, shared_in, parent_in, none_in = await _load_task_inputs(AsyncMock(), member.id)

        assert plain_in.complexity_points == 3 and plain_in.deadline == days_from_today(5)
        # With our new logic, effort_share is calculated as 1 / assigned_member_count
        # Since we mocked get_task_members to return 1 member, share = 1/1 = 1
        assert plain_in.effort_share == D("1") and plain_in.is_parent is False
        assert shared_in.effort_share == D("0.5") and shared_in.deadline is None
        assert parent_in.is_parent is True
        assert none_in.complexity_points == 0

    @pytest.mark.asyncio
    async def test_soft_deleted_tasks_are_skipped(self, monkeypatch):
        member = make_member()
        alive = make_task(TaskStatus.IN_PROGRESS, Complexity.LOW, 1)
        gone = make_task(TaskStatus.IN_PROGRESS, Complexity.HIGH, 1, deleted=True)
        patch_workload(monkeypatch, [member], {member.id: [alive, gone]})

        inputs = await _load_task_inputs(AsyncMock(), member.id)

        assert len(inputs) == 1 and inputs[0].complexity_points == 1

    @pytest.mark.asyncio
    async def test_assignment_without_task_id_is_ignored(self, monkeypatch):
        member = make_member()
        patch_workload(monkeypatch, [member])
        monkeypatch.setattr(
            f"{ASSIGNED_SERVICE}.get_members",
            AsyncMock(return_value=[SimpleNamespace(task_id=None, effort_share=None)]),
        )

        assert await _load_task_inputs(AsyncMock(), member.id) == []

    @pytest.mark.asyncio
    async def test_member_with_no_tasks(self, monkeypatch):
        member = make_member()
        patch_workload(monkeypatch, [member])

        assert await _load_task_inputs(AsyncMock(), member.id) == []


# --------------------------------------------------------------------------- #
# calculate_project_workload
# --------------------------------------------------------------------------- #

class TestCalculateProjectWorkload:
    @pytest.mark.asyncio
    async def test_member_with_mixed_tasks_end_to_end(self, monkeypatch):
        # Same task mix as the old totals test. Raw 6, effective 7 (see test_workload_math).
        member = make_member()
        tasks = [
            make_task(TaskStatus.NOT_STARTED, Complexity.MEDIUM, 1),   # raw 2, eff 3.0
            make_task(TaskStatus.IN_PROGRESS, Complexity.HIGH, 1),     # raw 3, eff 3.0
            make_task(TaskStatus.COMPLETED, Complexity.LOW, 1),        # excluded
            make_task(TaskStatus.SUBMITTED, Complexity.HIGH, 1),       # excluded
            make_task(TaskStatus.NOT_STARTED, Complexity.LOW, 10),     # raw 1, eff 1.0
        ]
        mocks = patch_workload(monkeypatch, [member], {member.id: tasks})

        result = await ProjectSnapshotService.calculate_project_workload(AsyncMock(), uuid4())

        row = persisted_by_member(mocks)[member.id]
        assert row["total_points"] == D("6.00")
        assert row["total_effective_points"] == D("7.00")
        assert result.total_effective_points == D("7.00")
        assert persisted_project_total(mocks) == 7

    @pytest.mark.asyncio
    async def test_every_member_is_persisted_including_advisors(self, monkeypatch):
        leader = make_member(ProjectRole.LEADER)
        worker = make_member(ProjectRole.MEMBER)
        no_role = make_member(None)
        advisor = make_member(ProjectRole.ADVISOR)
        instructor = make_member(ProjectRole.INSTRUCTOR)
        members = [leader, worker, no_role, advisor, instructor]
        mocks = patch_workload(monkeypatch, members)

        await ProjectSnapshotService.calculate_project_workload(AsyncMock(), uuid4())

        persisted = persisted_by_member(mocks)
        assert set(persisted) == {m.id for m in members}       # nobody keeps a stale row
        for non_worker in (advisor, instructor):
            assert persisted[non_worker.id]["workload_status"] == MemberStatus.NORMAL
            assert persisted[non_worker.id]["is_over_threshold"] is False

    @pytest.mark.asyncio
    async def test_overloaded_worker_is_flagged_and_advisors_are_not_in_the_median(self, monkeypatch):
        # Workers at 2 / 4 / 6 effective (IN_PROGRESS, so no urgency scaling) plus two idle advisors.
        # Workers only: median 4. If the advisors were wrongly counted, [0, 0, 2, 4, 6] has median 2,
        # which would flag the 4 as overloaded too. So b being NORMAL proves they are excluded.
        a, b, c = make_member(), make_member(), make_member()
        advisor_1, advisor_2 = make_member(ProjectRole.ADVISOR), make_member(ProjectRole.ADVISOR)
        tasks = {
            a.id: [make_task(TaskStatus.IN_PROGRESS, Complexity.MEDIUM)],                                    # 2
            b.id: [make_task(TaskStatus.IN_PROGRESS, Complexity.MEDIUM) for _ in range(2)],                  # 4
            c.id: [make_task(TaskStatus.IN_PROGRESS, Complexity.HIGH) for _ in range(2)],                    # 6
        }
        mocks = patch_workload(monkeypatch, [a, b, c, advisor_1, advisor_2], tasks)

        await ProjectSnapshotService.calculate_project_workload(AsyncMock(), uuid4())

        persisted = persisted_by_member(mocks)
        assert persisted[c.id]["total_effective_points"] == D("6.00")
        assert persisted[c.id]["expected_load"] == D("4.00")
        assert persisted[c.id]["workload_status"] == MemberStatus.OVERLOADED
        assert persisted[c.id]["is_over_threshold"] is True
        assert persisted[b.id]["workload_status"] == MemberStatus.NORMAL      # equal to expected is not overloaded
        assert persisted[a.id]["workload_status"] == MemberStatus.NORMAL      # 2 == 4 * 0.5, boundary is not underutilized

    @pytest.mark.asyncio
    async def test_silenced_member_is_persisted_with_true_status(self, monkeypatch):
        quiet = make_member(silence=True)
        others = [make_member(), make_member()]
        tasks = {
            quiet.id: [make_task(TaskStatus.IN_PROGRESS, Complexity.HIGH)],     # 3
            others[0].id: [make_task(TaskStatus.IN_PROGRESS, Complexity.LOW)],  # 1
            others[1].id: [make_task(TaskStatus.IN_PROGRESS, Complexity.LOW)],  # 1
        }
        mocks = patch_workload(monkeypatch, [quiet] + others, tasks)

        result = await ProjectSnapshotService.calculate_project_workload(AsyncMock(), uuid4())

        row = persisted_by_member(mocks)[quiet.id]
        assert row["workload_status"] == MemberStatus.OVERLOADED   # data is never hidden (spec 7.2)
        assert row["is_over_threshold"] is True
        suppressed = {r.member_id: r.warning_suppressed for r in result.members}
        assert suppressed[quiet.id] is True

    @pytest.mark.asyncio
    async def test_fallback_count_resets_only_when_not_over_threshold(self, monkeypatch):
        over, fine, fine_2 = make_member(), make_member(), make_member()
        tasks = {
            over.id: [make_task(TaskStatus.IN_PROGRESS, Complexity.HIGH)],
            fine.id: [make_task(TaskStatus.IN_PROGRESS, Complexity.LOW)],
            fine_2.id: [make_task(TaskStatus.IN_PROGRESS, Complexity.LOW)],
        }
        mocks = patch_workload(monkeypatch, [over, fine, fine_2], tasks)

        await ProjectSnapshotService.calculate_project_workload(AsyncMock(), uuid4())

        persisted = persisted_by_member(mocks)
        assert persisted[fine.id]["consecutive_fallback_count"] == 0       # spec 8.1 reset
        assert "consecutive_fallback_count" not in persisted[over.id]      # left for the recommendation loop

    @pytest.mark.asyncio
    async def test_missing_capacity_multiplier_defaults_and_does_not_crash(self, monkeypatch):
        # Old sketch: Decimal(str(None)) raised InvalidOperation.
        members = [make_member(capacity=None), make_member(capacity=1.5)]
        mocks = patch_workload(monkeypatch, members)

        result = await ProjectSnapshotService.calculate_project_workload(AsyncMock(), uuid4())

        assert [r.capacity_multiplier for r in result.members] == [D("1.0"), D("1.5")]
        assert len(persisted_by_member(mocks)) == 2

    @pytest.mark.asyncio
    async def test_status_flags_map_to_member_status_by_name(self, monkeypatch):
        idle, normal, busy = make_member(), make_member(), make_member()
        # effective: idle 0, normal 4, busy 10 -> median 4 -> idle underutilized, busy overloaded
        tasks = {
            normal.id: [make_task(TaskStatus.IN_PROGRESS, Complexity.HIGH), make_task(TaskStatus.IN_PROGRESS, Complexity.LOW)],
            busy.id: [make_task(TaskStatus.IN_PROGRESS, Complexity.HIGH) for _ in range(3)]
            + [make_task(TaskStatus.IN_PROGRESS, Complexity.LOW)],
        }
        mocks = patch_workload(monkeypatch, [idle, normal, busy], tasks)

        await ProjectSnapshotService.calculate_project_workload(AsyncMock(), uuid4())

        persisted = persisted_by_member(mocks)
        assert persisted[idle.id]["workload_status"] == MemberStatus.UNDERUTILIZED
        assert persisted[normal.id]["workload_status"] == MemberStatus.NORMAL
        assert persisted[busy.id]["workload_status"] == MemberStatus.OVERLOADED

    # ----- project total ----- #
    @pytest.mark.asyncio
    async def test_project_total_is_sum_of_counted_members_rounded_half_up(self, monkeypatch):
        a, b = make_member(), make_member()
        advisor = make_member(ProjectRole.ADVISOR)
        tasks = {
            a.id: [make_task(TaskStatus.NOT_STARTED, Complexity.MEDIUM, 20)],   # 2 * 0.75 = 1.5
            b.id: [make_task(TaskStatus.IN_PROGRESS, Complexity.LOW)],          # 1.0
            advisor.id: [make_task(TaskStatus.IN_PROGRESS, Complexity.HIGH)],   # not counted
        }
        mocks = patch_workload(monkeypatch, [a, b, advisor], tasks)

        await ProjectSnapshotService.calculate_project_workload(AsyncMock(), uuid4())

        assert persisted_project_total(mocks) == 3        # 2.5 rounds half UP to 3 (not banker's 2)

    @pytest.mark.asyncio
    async def test_project_with_no_counted_members_writes_zero_not_stale_total(self, monkeypatch):
        advisor = make_member(ProjectRole.ADVISOR)
        mocks = patch_workload(monkeypatch, [advisor])

        await ProjectSnapshotService.calculate_project_workload(AsyncMock(), uuid4())

        assert persisted_project_total(mocks) == 0

    @pytest.mark.asyncio
    async def test_project_with_no_members_writes_zero(self, monkeypatch):
        mocks = patch_workload(monkeypatch, [])

        result = await ProjectSnapshotService.calculate_project_workload(AsyncMock(), uuid4())

        assert result.members == []
        assert persisted_project_total(mocks) == 0

    # ----- dates ----- #
    @pytest.mark.asyncio
    async def test_explicit_today_overrides_the_clock(self, monkeypatch):
        # NOT_STARTED MEDIUM due 2026-09-24. From 09-21 that is 3 days (1.5x -> 3.0);
        # from 09-10 it is 14 days (1.0x -> 2.0).
        member = make_member()
        task = make_task(TaskStatus.NOT_STARTED, Complexity.MEDIUM, 3)
        mocks = patch_workload(monkeypatch, [member], {member.id: [task]})

        await ProjectSnapshotService.calculate_project_workload(AsyncMock(), uuid4(), today=date(2026, 9, 21))
        assert persisted_by_member(mocks)[member.id]["total_effective_points"] == D("3.00")

        mocks.member_upsert.reset_mock()
        await ProjectSnapshotService.calculate_project_workload(AsyncMock(), uuid4(), today=date(2026, 9, 10))
        assert persisted_by_member(mocks)[member.id]["total_effective_points"] == D("2.00")

    @pytest.mark.asyncio
    async def test_default_today_is_the_manila_date(self, monkeypatch):
        # Task due 2026-09-25. At 01:00 Manila on the 22nd (17:00 UTC on the 21st) it is 3 days
        # away -> 1.5x -> 3.0. The old server-local/UTC date would see 4 days -> 1.25x -> 2.5.
        member = make_member()
        task = SimpleNamespace(
            id=uuid4(), status=TaskStatus.NOT_STARTED, complexity=Complexity.MEDIUM,
            deadline=date(2026, 9, 25), has_subtasks=False, deleted_at=None,
        )
        mocks = patch_workload(monkeypatch, [member], {member.id: [task]})

        with freeze_time("2026-09-21 17:00:00"):
            await ProjectSnapshotService.calculate_project_workload(AsyncMock(), uuid4())

        assert persisted_by_member(mocks)[member.id]["total_effective_points"] == D("3.00")

    # ----- concurrency / transaction ----- #
    @pytest.mark.asyncio
    async def test_project_row_is_locked_once_before_reading(self, monkeypatch):
        project_id = uuid4()
        mocks = patch_workload(monkeypatch, [make_member()])

        await ProjectSnapshotService.calculate_project_workload(AsyncMock(), project_id)

        mocks.lock.assert_awaited_once()
        assert mocks.lock.await_args.args[1] == project_id

    @pytest.mark.asyncio
    async def test_commits_once_by_default(self, monkeypatch):
        db = AsyncMock()
        patch_workload(monkeypatch, [make_member(), make_member()])

        await ProjectSnapshotService.calculate_project_workload(db, uuid4())

        db.commit.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_commit_false_leaves_the_transaction_to_the_caller(self, monkeypatch):
        db = AsyncMock()
        patch_workload(monkeypatch, [make_member()])

        await ProjectSnapshotService.calculate_project_workload(db, uuid4(), commit=False)

        db.commit.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_custom_config_is_used(self, monkeypatch):
        # 11 vs median 10 is overloaded strictly, but not with a 15% tolerance band.
        # (Each task needs its own id: repeating one task object would collapse into a single task.)
        def highs(n):
            return [make_task(TaskStatus.IN_PROGRESS, Complexity.HIGH) for _ in range(n)]

        members = [make_member() for _ in range(3)]
        tasks = {
            members[0].id: highs(3) + [make_task(TaskStatus.IN_PROGRESS, Complexity.LOW)],      # 10
            members[1].id: highs(3) + [make_task(TaskStatus.IN_PROGRESS, Complexity.LOW)],      # 10
            members[2].id: highs(3) + [make_task(TaskStatus.IN_PROGRESS, Complexity.MEDIUM)],   # 11
        }
        mocks = patch_workload(monkeypatch, members, tasks)

        await ProjectSnapshotService.calculate_project_workload(AsyncMock(), uuid4())
        assert persisted_by_member(mocks)[members[2].id]["workload_status"] == MemberStatus.OVERLOADED

        mocks.member_upsert.reset_mock()
        cfg = wm.WorkloadConfig(overload_tolerance=D("0.15"))
        await ProjectSnapshotService.calculate_project_workload(AsyncMock(), uuid4(), config=cfg)
        assert persisted_by_member(mocks)[members[2].id]["workload_status"] == MemberStatus.NORMAL


# --------------------------------------------------------------------------- #
# sync_unassigned_tasks
# --------------------------------------------------------------------------- #

class TestSyncUnassignedTasks:
    def _patch_repo(self, monkeypatch, count):
        repo = MagicMock()
        repo.count_unassigned_tasks = AsyncMock(return_value=count)
        repo.upsert_today_snapshot = AsyncMock(return_value="snapshot")
        monkeypatch.setattr(f"{MODULE}.ProjectSnapshotRepo", MagicMock(return_value=repo))
        monkeypatch.setattr(f"{MODULE}.ProjectSnapshotUpsert", lambda **kw: kw)
        return repo

    @pytest.mark.asyncio
    async def test_writes_only_the_unassigned_count(self, monkeypatch):
        repo = self._patch_repo(monkeypatch, 5)
        project_id = uuid4()

        snapshot = await ProjectSnapshotService.sync_unassigned_tasks(AsyncMock(), project_id)

        # Only unassigned_tasks is set, so the partial upsert cannot null total_workload_points
        repo.upsert_today_snapshot.assert_awaited_once_with(project_id, {"unassigned_tasks": 5})
        assert snapshot == "snapshot"

    @pytest.mark.asyncio
    async def test_commit_is_optional(self, monkeypatch):
        self._patch_repo(monkeypatch, 0)
        db = AsyncMock()

        await ProjectSnapshotService.sync_unassigned_tasks(db, uuid4())
        db.commit.assert_awaited_once()

        db.commit.reset_mock()
        await ProjectSnapshotService.sync_unassigned_tasks(db, uuid4(), commit=False)
        db.commit.assert_not_awaited()


if __name__ == "__main__":
    pytest.main([__file__])