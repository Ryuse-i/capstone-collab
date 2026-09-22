# Changes Made to Fix Project Snapshot Unassigned Tasks Tracking

## Problem
The `unassigned_tasks` field on ProjectSnapshot was maintained as an incremental counter that drifted from reality because:
1. It was only updated on task create/delete (not member assignment changes)
2. The incremental approach was inaccurate for tasks that get assigned members via separate API calls
3. No logic existed in assigned_members service to update snapshot on member assignment/unassignment

## Solution
Replaced incremental counter with recomputed count that queries actual state:
- Count of Task rows with no related AssignedMember rows for a project
- Updated whenever task/assignment state changes that could affect count

## Files Changed

### Backend
1. **`backend/app/modules/project_snapshots/repo.py`**
   - Added `count_unassigned_tasks(self, project_id: UUID) -> int` method
   - SQL: `SELECT COUNT(Task.id) FROM Task LEFT JOIN AssignedMember ON Task.id = AssignedMember.task_id WHERE Task.project_id = :project_id AND AssignedMember.id IS NULL`

2. **`backend/app/modules/project_snapshots/services.py`**
   - Added `sync_unassigned_tasks(db: AsyncSession, project_id: UUID)` static method
   - Calls repo method and upserts today's snapshot with computed count

3. **`backend/app/modules/tasks/services.py`**
   - `create_task()`: Removed manual +1 logic, added `sync_unassigned_tasks()` call after creation
   - `delete_task()`: Removed manual -1 logic, added `sync_unassigned_tasks()` call after deletion

4. **`backend/app/modules/assigned_members/services.py`**
   - `create_assigned_member()`: Added `sync_unassigned_tasks()` call after creation (fetch project_id via member.task_id)
   - `delete_assigned_member()`: Added `sync_unassigned_tasks()` call after deletion (fetch project_id via db_item.task_id)
   - Did NOT modify `batch_create_members()`, `get_members()`, `get_members_with_task()`, `update_assigned_member()` (as instructed)

### Frontend
1. **`frontend/src/hooks/useAssignedMember.ts`**
   - Added import: `import { projectKeys } from "./useProject";`
   - Updated `useCreateAssignedMember()`: Accept projectId in variables, invalidate `projectKeys.detailSnapshot(projectId)` on success
   - Updated `useDeleteAssignedMember()`: Accept projectId in variables, invalidate `projectKeys.detailSnapshot(projectId)` on success

2. **`frontend/src/components/user/AddTaskDialog.tsx`**
   - Added import: `import { projectKeys } from "@/hooks/useProject";`
   - Pass `projectId` in `createAssignedMemberMutation.mutateAsync()` variables
   - Invalidate `projectKeys.detailSnapshot(projectId)` after all assignments complete

3. **`frontend/src/components/user/EditTaskDialog.tsx`**
   - Added import: `import { projectKeys } from "@/hooks/useProject";`
   - Pass `projectId` in both `createAssignedMember` and `deleteAssignedMember` mutations
   - Invalidate `projectKeys.detailSnapshot(projectId)` after assignment changes complete

## Verification
- ✅ All Python files compile without syntax errors
- ✅ Only modified specified files/methods
- ✅ Did not modify migrations, models, schemas, or prohibited methods
- ✅ Maintained existing code patterns and conventions
- ✅ Frontend properly invalidates snapshot queries for immediate UI updates
- ✅ Solution eliminates drift by recomputing count from actual state