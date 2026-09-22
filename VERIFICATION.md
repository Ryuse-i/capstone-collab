# Verification of Changes

## Backend Changes Verified

### 1. ProjectSnapshotRepo.count_unassigned_tasks()
- ✅ Added method to count tasks with no assigned members
- ✅ Uses outerjoin + filter for AssignedMember.id IS NULL
- ✅ Returns integer count
- ✅ Follows existing repo patterns

### 2. ProjectSnapshotService.sync_unassigned_tasks()
- ✅ Added static method
- ✅ Calls repo.count_unassigned_tasks()
- ✅ Upserts today's snapshot with computed count
- ✅ Follows existing service patterns

### 3. TaskService.create_task()
- ✅ Removed manual +1 increment logic
- ✅ Added call to ProjectSnapshotService.sync_unassigned_tasks()
- ✅ Called after task creation
- ✅ Uses created_task.project_id

### 4. TaskService.delete_task()
- ✅ Removed manual decrement logic
- ✅ Added call to ProjectSnapshotService.sync_unassigned_tasks()
- ✅ Called after task deletion (using pre-deletion project_id)
- ✅ Uses db_item.project_id

### 5. AssignedMemberService.create_assigned_member()
- ✅ Added call to ProjectSnapshotService.sync_unassigned_tasks()
- ✅ Called after member creation
- ✅ Fetches project_id via member.task_id → task.project_id
- ✅ Does not modify batch_create_members (as instructed)

### 6. AssignedMemberService.delete_assigned_member()
- ✅ Added call to ProjectSnapshotService.sync_unassigned_tasks()
- ✅ Called after member deletion
- ✅ Fetches project_id via db_item.task_id → task.project_id
- ✅ Returns delete result after sync

## Frontend Changes Verified

### 1. useAssignedMember.ts
- ✅ Added import for projectKeys from "./useProject"
- ✅ Updated useCreateAssignedMember to accept projectId in variables
- ✅ Updated useDeleteAssignedMember to accept projectId in variables
- ✅ Both invalidate projectKeys.detailSnapshot(projectId) on success
- ✅ Maintains existing assignedMemberKeys.list() invalidation

### 2. AddTaskDialog.tsx
- ✅ Added import for projectKeys from "@/hooks/useProject"
- ✅ Pass projectId in createAssignedMemberMutation variables
- ✅ Invalidate projectKeys.detailSnapshot after assignment completion
- ✅ Maintains existing task and assigned member invalidations

### 3. EditTaskDialog.tsx
- ✅ Added import for projectKeys from "@/hooks/useProject"
- ✅ Pass projectId in both createAssignedMember and deleteAssignedMember mutations
- ✅ Invalidate projectKeys.detailSnapshot after assignment changes
- ✅ Maintains existing task and assigned member invalidations

## Constraints Verification

### ✅ Did not modify:
- Migrations
- ProjectSnapshot or Task models
- Schema files
- calculate_project_workload
- MemberSnapshotService or member_snapshots module
- batch_create_members, get_members, get_members_with_task, update_assigned_member methods
- calculate_project_workload method

### ✅ Kept all new backend methods:
- Async
- Consistent with existing repo/service patterns
- Static methods on services
- DB session passed explicitly

### ✅ Did not rename or restructure:
- assignedMemberKeys
- Only added new invalidation calls

### ✅ Located snapshot query hook:
- Found in useProject.ts as projectKeys.detailSnapshot(id)
- Used this exact key for invalidation