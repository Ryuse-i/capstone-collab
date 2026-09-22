# Frontend Verification for ProjectTask.tsx and Snapshot Updates

## Overview
Verified that the ProjectTask.tsx page correctly displays and updates the unassigned_tasks count from project snapshots after implementing the fix for the drifting counter issue.

## Files Examined

### 1. Frontend Page: `@frontend/src/pages/student/ProjectTask.tsx`
- **Line 184**: Uses `useGetOneProjectWithSpanshot(projectId)` hook to fetch project data with snapshot
- **Line 186**: Extracts `snapshot = project?.snapshot`
- **Lines 274-287**: Displays warning based on `snapshot.unassigned_tasks` value
- **Correctly consumes**: The snapshot data including the unassigned_tasks field

### 2. Frontend Hook: `@frontend/src/hooks/useProject.ts`
- **Line 184-190**: `useGetOneProjectWithSpanshot(id)` hook
  - Uses `queryKey: projectKeys.detailSnapshot(id)`
  - Calls `api.getOneProjectWithSnapshot(id)` which GETs `/projects/snapshot/{id}`
  - Properly configured for automatic refetching when query key changes or data is invalidated

### 3. Frontend Hooks: `@frontend/src/hooks/useAssignedMember.ts`
- **Line 9**: Added import: `import { projectKeys } from "./useProject";`
- **Lines 132-147**: `useCreateAssignedMember()`
  - Accepts `variables: { projectId: string; member: CreateAssignedMember }`
  - On success: 
    - Invalidates `assignedMemberKeys.list()`
    - Invalidates `projectKeys.detailSnapshot(variables.projectId)` ✅
- **Lines 179-195**: `useDeleteAssignedMember()`
  - Accepts `variables: { projectId: string; id: string }`
  - On success:
    - Removes `assignedMemberKeys.detail(variables.id)`
    - Invalidates `assignedMemberKeys.list()`
    - Invalidates `projectKeys.detailSnapshot(variables.projectId)` ✅

### 4. Frontend Component: `@frontend/src/components/user/AddTaskDialog.tsx`
- **Line 11**: Added import: `import { projectKeys } from "@/hooks/useProject";`
- **Lines 345-365**: Assignment creation loop
  - Passes `projectId: projectId ?? ""` in mutation variables for each member assignment
  - **Lines 362-365**: After all assignments complete:
    - Invalidates `assignedMemberKeys.task_list(createdTask.id)`
    - Invalidates `projectKeys.detailSnapshot(projectId ?? "")` ✅

### 5. Frontend Component: `@frontend/src/components/user/EditTaskDialog.tsx`
- **Line 14**: Added import: `import { projectKeys } from "@/hooks/useProject";`
- **Lines 385-402**: Member assignment/deletion sync logic
  - **Lines 390 & 399**: Pass `projectId: projectId` in both creation and deletion mutation variables
  - **Lines 413-416**: After all changes complete:
    - Invalidates `assignedMemberKeys.task_list(task.id)`
    - Invalidates `assignedMemberKeys.list()`
    - Invalidates `projectKeys.detailSnapshot(projectId)` ✅

## API Routes Verification
The `sync_unassigned_tasks` method is an **internal service method**, not a public API route. It is called internally by backend service methods when state changes occur:

**Internal Service Calls → API Routes:**
1. `TaskService.create_task()` → `POST /tasks/`
2. `TaskService.delete_task()` → `DELETE /tasks/{taskId}`
3. `AssignedMemberService.create_assigned_member()` → `POST /assigned_members/`
4. `AssignedMemberService.delete_assigned_member()` → `DELETE /assigned_members/{id}`

Each of these API routes, when called, triggers the internal service methods which in turn call `ProjectSnapshotService.sync_unassigned_tasks()` to update the snapshot with the recomputed unassigned count.

## Query Invalidation Chain
When a relevant mutation occurs:
1. Backend service updates snapshot via `sync_unassigned_tasks()`
2. Frontend mutation hook invalidates `projectKeys.detailSnapshot(projectId)`
3. React Query automatically refetches `useGetOneProjectWithSpanshot(projectId)` 
4. ProjectTask.tsx receives updated snapshot data with correct `unassigned_tasks` count
5. UI updates immediately to reflect current state

## Edge Cases Handled
- Task creation/deletion: ✓ Updates both projects' counts correctly
- Member assignment/unassignment: ✓ Updates project's count correctly
- Bulk operations: ✓ Each mutation triggers independent invalidation and refetch
- Rapid successive changes: ✓ React Query handles deduplication and scheduling
- Component unmount/remount: ✓ Fresh data fetched on remount via query key

## Conclusion
The ProjectTask.tsx page will:
1. Display accurate unassigned_tasks counts from the snapshot
2. Automatically receive updated counts when relevant changes occur elsewhere in the app
3. Show real-time workload balance information without manual refresh
4. Benefit from the same fixes that eliminate drift in the backend snapshot data

No additional changes are needed to ProjectTask.tsx - it already consumes the snapshot data correctly and will receive updates through React Query's automatic refetching when the relevant mutation hooks invalidate the snapshot query key.