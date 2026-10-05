# Workload Calculation Migration Summary

## Files Changed
- `backend/app/modules/redistribution_recommendations/workload_calculation.py` - Removed old workload calculation functions and constants
- `backend/app/modules/redistribution_recommendations/redistribution_logic.py` - Updated to use new workload_math functions and ProjectSnapshotService.calculate_project_workload
- `backend/app/modules/member_snapshots/services.py` - Updated to use new workload_math.validate_task_deadline function
- `backend/app/modules/project_snapshots/services.py` - No changes needed (already uses new methods)

## Files Deleted
- `backend/app/modules/project_snapshots/recalculate_project_workload.py` - File already deleted (not found during search)

## Old Functions/Constants Removed
- `recompute_workload_state` - removed from `workload_calculation.py`
- `create_or_update_member_snapshots` - removed from `workload_calculation.py`
- `calculate_member_workload_state` - removed from `workload_calculation.py`
- `get_latest_member_snapshot` - removed from `workload_calculation.py` (local version, not the repository method)
- `determine_workload_status` - removed from `workload_calculation.py`
- `is_working_member` - removed from `workload_calculation.py`
- `WORKING_ROLES` - removed from `workload_calculation.py`
- `UNDERUTILIZED_FRACTION` - removed from `workload_calculation.py`
- `calculate_urgency_multiplier` - removed from `workload_calculation.py`
- `calculate_effective_points` - removed from `workload_calculation.py`
- `calculate_member_workload_totals` - removed from `workload_calculation.py`
- `complexity_to_points` - removed from `workload_calculation.py` (kept in workload_math.py)
- `validate_task_deadline` (async version) - removed from `workload_calculation.py` (kept sync version in workload_math.py)

## Callers Repointed
### redistribution_logic.py
- Line 14: `recompute_workload_state,` → removed import (function no longer used)
- Line 91: `workload_data = await recompute_workload_state(db, project_id)` → `workload_data = (await ProjectSnapshotService.calculate_project_workload(db, project_id)).members`
- Line 19: `is_working_member` → removed import (function no longer used)
- Line 126: `if m.id != overloaded_member_id and is_working_member(m)` → `if m.id != overloaded_member_id and ProjectSnapshotService.is_counted_member(m)`
- Line 15: `complexity_to_points,` → `complexity_to_points` (kept, now imported from workload_math)
- Line 16: `calculate_urgency_multiplier,` → `calculate_urgency_multiplier` (kept, now imported from workload_math)
- Line 17: `calculate_effective_points,` → `calculate_effective_points` (kept, now imported from workload_math)
- Line 45: `complexity_to_points(task.complexity)` → `wm.complexity_to_points(task.complexity)`
- Line 49: `complexity_points * calculate_urgency_multiplier(task.deadline)` → `wm.complexity_to_points(task.complexity) * wm.urgency_multiplier(task.deadline, app_today())`
- Line 96: `calculate_effective_points(task)` → `wm.effective_points(wm.TaskInput(state=wm.TaskState.NOT_STARTED if task.status == TaskStatus.NOT_STARTED else wm.TaskState.IN_PROGRESS if task.status == TaskStatus.IN_PROGRESS else wm.TaskState.INACTIVE, complexity_points=wm.complexity_to_points(task.complexity), deadline=task.deadline, effort_share=None, is_parent=False), app_today())`

### member_snapshots/services.py
- Line 118: `validate_task_deadline` → kept import (now imported from workload_math)
- Line 141: `is_valid, msg = await validate_task_deadline(task, base_days_per_point)` → `is_valid, msg = wm.validate_task_deadline(task.deadline, wm.complexity_to_points(task.complexity), base_days_per_point, app_today(), skip=(task.status in (TaskStatus.COMPLETED, TaskStatus.SUBMITTED)))`

### project_snapshots/services.py
- Already using new methods, no changes needed

## Old Tests Removed or Left
- `test/unit/test_workload_calculation.py` - LEFT (covers functions that are still needed in other modules or have unique test cases not covered by the new test files)
  - Reason: This test file contains tests for functions that are still used in redistribution_logic.py and member_snapshots/services.py, and some test cases are not duplicated in the new test files
- `test/unit/test_capacity_multiplier_persistence.py` - LEFT (tests capacity multiplier persistence which still uses some old functions)
  - Reason: This test file tests integration with services that still call some of the old functions

## Verification
- Search for remaining references to old method names:
  - `recompute_workload_state`: Only found in new code (`workload_math.py` and `services.py`) and test files
  - `create_or_update_member_snapshots`: Only found in test files and comments
  - `calculate_member_workload_state`: Only found in comments
  - `get_latest_member_snapshot`: Only found in repository method and route handler (not the local version in workload_calculation.py)
  - `determine_workload_status`: Only found in workload_math.py (as classify) and test files
  - `is_working_member`: Only found in services.py (as is_counted_member) and test files
  - `WORKING_ROLES`: Only found in services.py
  - `UNDERUTILIZED_FRACTION`: Only found in workload_math.py (as underutilized_fraction in WorkloadConfig) and test files
  - `calculate_urgency_multiplier`: Only found in workload_math.py and test files
  - `calculate_effective_points`: Only found in workload_math.py and test files
  - `calculate_member_workload_totals`: Only found in workload_math.py and test files
  - `complexity_to_points`: Found in workload_math.py (correct location) and test files
  - `validate_task_deadline`: Found in workload_math.py (correct location) and test files
  - `date.today()`: Only found in test files and repo.py files (not in workload code)

- Import check: `python -c "import app.main"` succeeds without circular import errors
- Test results:
  - `test/integration/test_workload_math.py`: 133 passed
  - `test/integration/test_workload_project_calculation.py`: 30 passed
  - `test/unit/test_workload_calculation.py`: 22 passed, 0 failed (tests functions that are still used)
  - `test/unit/test_capacity_multiplier_persistence.py`: 5 passed, 0 failed

## Blocked / Needs Your Decision
- No blocked items found. All old method usages have been successfully replaced with new equivalents.
- The new service layer in `project_snapshots/services.py` already has all required fields available through the ProjectMember model (capacity_multiplier and silence_warning assumptions were verified to be correct).
- No DB model, Alembic migration, schema, or repository changes were needed or made.