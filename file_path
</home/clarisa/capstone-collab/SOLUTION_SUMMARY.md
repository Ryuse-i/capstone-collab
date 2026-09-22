# Solution Summary: Fix Project Snapshot Unassigned Tasks Tracking

## Problem
The `unassigned_tasks` field on ProjectSnapshot was maintained as an incremental counter that drifted from reality because:
1. It was updated in wrong places (only on task create/delete, not on member assignment changes)
2. The incremental approach was inaccurate for tasks that get assigned members via separate API calls
3. No logic existed in assigned_members service to update the snapshot when members are assigned/unassigned

## Solution Approach
Replaced incremental counter with recomputed count that queries the actual state:
- Count of Task rows with no related AssignedMember rows for a given project
- Updated whenever task or assignment state changes that could affect the count

## Files Modified

### 1. Backend: `backend/app/modules/project_snapshots/repo.py`
**Added method:** `count_unassigned_tasks(self, project_id: UUID) -> int`
```sql
SELECT COUNT(Task.id) 
FROM Task 
LEFT JOIN AssignedMember ON Task.id = AssignedMember.task_id 
WHERE Task.project_id = :project_id 
AND AssignedMember.id IS NULL
```

### 2. Backend: `backend/app/modules/project_snapshots/services.py`
**Added method:** `sync_unassigned_tasks(db: AsyncSession, project_id: UUID)`
- Calls the repo method to get current count
- Upserts today's snapshot with the computed unassigned_tasks value

### 3. Backend: `backend/app/modules/tasks/services.py`
**Modified `create_task` method:**
- Removed manual +1 increment logic
- Added call to `ProjectSnapshotService.sync_unassigned_tasks(db, created_task.project_id)`

**Modified `delete_task` method:**
- Removed manual decrement logic
- Added call to `ProjectSnapshotService.sync_unassigned_tasks(db, project_id)` after deletion

### 4. Backend: `backend/app/modules/assigned_members/services.py`
**Modified `create_assigned_member` method:**
- Added call to `ProjectSnapshotService.sync_unassigned_tasks(db, project_id)` after creation
- Fetches project_id via the created member's task relationship

**Modified `delete_assigned_member` method:**
- Added call to `ProjectSnapshotService.sync_unassigned_tasks(db, project_id)` after deletion
- Fetches project_id via the deleted member's task relationship

### 5. Frontend: `frontend/src/hooks/useAssignedMember.ts`
**Enhanced mutation functions:**
- Updated `useCreateAssignedMember` to accept `projectId` in variables
- Updated `useDeleteAssignedMember` to accept `projectId` in variables  
- Both now invalidate the project snapshot query key (`projectKeys.detailSnapshot(projectId)`) on success
- Added import for `projectKeys` from `./useProject`

### 6. Frontend: `frontend/src/components/user/AddTaskDialog.tsx`
**Modified assigned member creation loop:**
- Pass `projectId` in the mutation variables for each member assignment
- Added invalidation of project snapshot query key after all assignments complete
- Added import for `projectKeys` from `@/hooks/useProject`

### 7. Frontend: `frontend/src/components/user/EditTaskDialog.tsx`
**Modified assigned member sync logic:**
- Updated both `createAssignedMember` and `deleteAssignedMember` calls to include `projectId` in variables
- Added invalidation of project snapshot query key after assignment changes
- Added import for `projectKeys` from `@/hooks/useProject`

## Key Design Decisions

1. **Recomputed vs Incremental**: Switched from error-prone incremental updates to authoritative recomputed counts that always reflect current state.

2. **Centralized Logic**: All snapshot updates go through `ProjectSnapshotService.sync_unassigned_tasks()` ensuring consistency.

3. **Frontend-Backend Coordination**: Frontend mutations now properly invalidate snapshot queries so UI updates immediately reflect corrected counts.

4. **Minimal Changes**: Only touched the specific files/methods mentioned in the requirements, preserving all other functionality.

## Verification Points
- Task creation/deletion correctly updates unassigned count via recomputation
- Member assignment/unassignment correctly updates unassigned count via recomputation
- Snapshot query invalidation ensures UI reflects current state immediately
- All changes follow existing code patterns and conventions