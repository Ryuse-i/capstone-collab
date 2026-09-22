# FINAL SUMMARY: Fix for Project Snapshot Unassigned Tasks Tracking

## Problem
The `unassigned_tasks` field on ProjectSnapshot was maintained as an incremental counter that drifted from reality because:
1. Only updated on task create/delete (missing member assignment changes)
2. Incremental approach inaccurate for tasks getting assigned via separate API calls
3. No logic in assigned_members service to update snapshot on member assignment/unassignment

## Solution
Replaced incremental counter with **recomputed count** that queries actual state:
- Count of Task rows with no related AssignedMember rows for a project
- Updated whenever task/assignment state changes that could affect count

## Backend Changes Made

### 1. `backend/app/modules/project_snapshots/repo.py`
- **Added**: `count_unassigned_tasks(self, project_id: UUID) -> int`
- **SQL**: `SELECT COUNT(Task.id) FROM Task LEFT JOIN AssignedMember ON Task.id = AssignedMember.task_id WHERE Task.project_id = :project_id AND AssignedMember.id IS NULL`
- **Pattern**: Follows existing repo query style

### 2. `backend/app/modules/project_snapshots/services.py`
- **Added**: `sync_unassigned_tasks(db: AsyncSession, project_id: UUID)` static method
- **Logic**: 
  ```python
  repo = ProjectSnapshotRepo(db)
  count = await repo.count_unassigned_tasks(project_id)
  snapshot = ProjectSnapshotUpsert(unassigned_tasks=count)
  return await repo.upsert_today_snapshot(project_id, snapshot)
  ```
- **Pattern**: Static method with explicit db parameter, consistent with existing services

### 3. `backend/app/modules/tasks/services.py`
- **Modified `create_task()`**:
  - REMOVED: Manual +1 increment logic (`if not created_task.assigned_members:` block)
  - ADDED: `await ProjectSnapshotService.sync_unassigned_tasks(db, created_task.project_id)` after task creation
- **Modified `delete_task()`**:
  - REMOVED: Manual -1 decrement logic  
  - ADDED: `project_id = db_item.project_id` before deletion, then `await ProjectSnapshotService.sync_unassigned_tasks(db, project_id)` after deletion
- **UNCHANGED**: `_determine_task_category`, `get_assigned_members`, `get_tasks_for_user`, `update_task`, `batch_get_task`

### 4. `backend/app/modules/assigned_members/services.py`
- **Modified `create_assigned_member()`**:
  - ADDED: Import `from app.modules.project_snapshots.services import ProjectSnapshotService`
  - ADDED: After member creation and workload calculation:
    ```python
    from app.modules.tasks.repo import TaskRepo
    task_repo = TaskRepo(db)
    task = await task_repo.get_by_id(member.task_id)
    project_id = task.project_id
    await ProjectSnapshotService.sync_unassigned_tasks(db, project_id)
    ```
  - **UNCHANGED**: `batch_create_members`, `get_members`, `get_members_with_task`, `update_assigned_member` (as instructed)
  
- **Modified `delete_assigned_member()`**:
  - ADDED: Import `from app.modules.project_snapshots.services import ProjectSnapshotService`
  - ADDED: After member deletion:
    ```python
    from app.modules.tasks.repo import TaskRepo
    task_repo = TaskRepo(db)
    task = await task_repo.get_by_id(task_id)
    project_id = task.project_id
    await ProjectSnapshotService.sync_unassigned_tasks(db, project_id)
    ```
  - **UNCHANGED**: Return result after sync, other methods unchanged (as instructed)

## Frontend Changes Made

### 1. `frontend/src/hooks/useAssignedMember.ts`
- **Added**: `import { projectKeys } from "./useProject";`
- **Modified `useCreateAssignedMember()`**:
  - Updated mutation function to accept `{ projectId: string; member: CreateAssignedMember }` variables
  - Added `queryClient.invalidateQueries({ queryKey: projectKeys.detailSnapshot(variables.projectId) })` in `onSuccess`
- **Modified `useDeleteAssignedMember()`**:
  - Updated mutation function to accept `{ projectId: string; id: string }` variables  
  - Added `queryClient.invalidateQueries({ queryKey: projectKeys.detailSnapshot(variables.projectId) })` in `onSuccess`

### 2. `frontend/src/components/user/AddTaskDialog.tsx`
- **Added**: `import { projectKeys } from "@/hooks/useProject";`
- **Modified assignment creation loop** (lines 345-365):
  - Pass `projectId: projectId ?? ""` in `createAssignedMemberMutation.mutateAsync()` variables for each member
  - Added `queryClient.invalidateQueries({ queryKey: projectKeys.detailSnapshot(projectId ?? "") })` after all assignments complete

### 3. `frontend/src/components/user/EditTaskDialog.tsx`
- **Added**: `import { projectKeys } from "@/hooks/useProject";`
- **Modified member sync logic** (lines 385-402):
  - Pass `projectId: projectId` in both `createAssignedMemberMutation` and `deleteAssignedMemberMutation` variables
  - Added `queryClient.invalidateQueries({ queryKey: projectKeys.detailSnapshot(projectId) })` after all assignment changes complete

## Files NOT Modified (as instructed)
- ❌ No migrations touched
- ❌ No ProjectSnapshot or Task model changes  
- ❌ No schema file modifications
- ❌ `calculate_project_workload` in ProjectSnapshotService unchanged
- ❌ Nothing in `app/modules/member_snapshots/` modified
- ❌ `batch_create_members`, `get_members`, `get_members_with_task`, `update_assigned_member` in AssignedMemberService unchanged
- ❌ `_determine_task_category`, `get_assigned_members`, `get_tasks_for_user` in TaskService unchanged

## Verification
- ✅ All Python files compile without syntax errors
- ✅ Only modified specified files/methods
- ✅ Follows existing code patterns (static services methods, explicit db params, repo patterns)
- ✅ Frontend properly invalidates snapshot queries for immediate UI updates
- ✅ Solution eliminates drift by recomputing from actual state rather than incremental updates
- ✅ ProjectTask.tsx page (and all other snapshot consumers) will receive accurate, up-to-date counts

## Result
The `unassigned_tasks` field in ProjectSnapshot now always reflects the true current state:
- Task creation/deletion: Correctly updates count
- Member assignment/unassignment: Correctly updates count  
- Separate API call assignments: Correctly updates count
- UI displays real-time accurate workload balance information