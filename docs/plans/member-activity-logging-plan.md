# Member Activity Logging Plan

This plan identifies all locations where member activity should be logged using `MemberActivityService.log()`.

## Member Activity Service Specification
```python
await MemberActivityService.log(
    db: AsyncSession,
    *,
    project_id: UUID,
    user_id: UUID,
    type: ActivityType,  # Enum: task_created, task_submitted, task_status_changed, comment_added, member_joined, revision_requested, submission_accepted
    message: str,        # Stored in detail field
    task_id: UUID | None = None,
    commit: bool = True,
) -> None
```
Service automatically skips logging if user is not a project member.

## Locations Requiring Member Activity Logging

### 1. Task Creation
**File:** `backend/app/modules/tasks/services.py`
**Function:** `TaskService.create_task()` (line 47)
**Triggering code:** 
```python
created_task = await repo.create(task)
```
**Evidence:** Line 47 shows task creation via repository
**Member activity equivalent:** 
- **Location:** After task creation (line 47) but before returning (line 51)
- **Function/method:** `TaskService.create_task()`
- **Exact triggering code:** Line 47

### 2. Task Submission
**File:** `backend/app/modules/tasks/routes.py`
**Function:** Route handler for PATCH `/{task_id}` (lines 73-101)
**Triggering code:**
```python
if previous_status != updated.status and updated.status == Status.SUBMITTED:
    event_type = "task_submitted"
```
**Evidence:** Lines 89-90 show status change detection to SUBMITTED
**Member activity equivalent:**
- **Location:** Same condition block (lines 89-90)
- **Function/method:** Route handler function (lines 73-101)
- **Exact triggering code:** Lines 89-90

### 3. Task Status Change (General)
**File:** `backend/app/modules/tasks/routes.py`
**Function:** Route handler for PATCH `/{task_id}` (lines 73-101)
**Triggering code:**
```python
previous_status = db_item.status
# ... 
updated = await TaskService.update_task(db, db_item, task)
event_type = "task_updated"
if previous_status != updated.status and updated.status == Status.SUBMITTED:
    event_type = "task_submitted"
elif previous_status != updated.status and updated.status == Status.COMPLETED:
    event_type = "task_completed"
```
**Evidence:** Lines 86-100 show status change detection logic
**Member activity equivalent:**
- **Location:** For status changes not covered by SUBMITTED/COMPLETED cases (would be in the "task_updated" path)
- **Function/method:** Route handler function (lines 73-101)
- **Exact triggering code:** Lines 86-88 (general update detection)

### 4. Comment Addition
**File:** `backend/app/modules/task_comments/services.py`
**Function:** `TaskCommentService.create_task_comment()` (lines 24-27)
**Triggering code:**
```python
return await repo.create(task_comment)
```
**Evidence:** Line 26 shows comment creation via repository
**Member activity equivalent:**
- **Location:** After comment creation (line 26) but before returning (line 27)
- **Function/method:** `TaskCommentService.create_task_comment()`
- **Exact triggering code:** Line 26

### 5. Member Joins Project
**File:** `backend/app/modules/project_members/services.py`
**Function:** `ProjectMemberService.add_member()` (lines 55-98)
**Triggering code:**
```python
result = await repo.create(project_member)
```
**Evidence:** Line 83 shows member creation via repository
**Member activity equivalent:**
- **Location:** After member creation (line 83) and before returning result (line 92)
- **Function/method:** `ProjectMemberService.add_member()`
- **Exact triggering code:** Line 83 (member creation) and lines 85-90 (snapshot creation)

### 6. Revision Requested
**File:** `backend/app/modules/revision_notes/services.py`
**Function:** `RevisionNoteService.reject_task()` (lines 25-47)
**Triggering code:**
```python
# Send the task back so the assignee can rework it.
# TODO: swap for a dedicated REVISION / REJECTED status if you add one.
await TaskService.update_task(db, task, TaskUpdate(status=Status.IN_PROGRESS))
```
**Evidence:** Line 46 shows task status update to IN_PROGRED upon rejection
**Member activity equivalent:**
- **Location:** After revision note creation (line 42) and before returning note (line 47)
- **Function/method:** `RevisionNoteService.reject_task()`
- **Exact triggering code:** Lines 42-43 (note creation) and line 46 (task status update)

### 7. Submission Accepted
**File:** `backend/app/modules/task_submissions/services.py`
**Function:** `TaskSubmissionService.update_task_submission()` (lines 23-26)
**Triggering code:** 
```python
return await repo.update(db_item, task_submission)
```
**Evidence:** Line 25 shows submission update via repository
**Member activity equivalent:**
- **Location:** In update function when checking if result is being set to ACCEPTED
- **Function/method:** `TaskSubmissionService.update_task_submission()`
- **Exact triggering code:** Line 25 (requires additional logic to check for Result.ACCEPTED)
- **Note:** UNVERIFIED - Requires verifying that submission result update to ACCEPTED triggers submission acceptance and checking for Result.ACCEPTED in update function

## Read-Side Consistency Considerations

When adding new activity logging, verify that the frontend can properly display the activity:
- **File:** `frontend/src/hooks/useMemberActivity.ts`
  - Check TYPE_META mapping for ActivityType values
- **File:** `frontend/src/pages/instructor/Dashboard.tsx`  
  - Check ACTIVITY_ICONS mapping for ActivityType values

If using existing ActivityType values, no frontend changes should be needed. If new ActivityType values are required (not recommended per constraints), frontend updates would be needed in both files.

## Verification Status Summary
- **VERIFIED**: Locations 1, 2, 3, 4, 5, 6 have been confirmed through direct code examination
- **UNVERIFIED**: Location 7 requires additional verification to confirm exact triggering condition for submission acceptance