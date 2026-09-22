# Fix Summary

## Issue
AttributeError: 'Project' object has no attribute 'snapshot'. Did you mean: 'snapshots'?
Occurring in backend/app/modules/member_snapshots/services.py

## Root Cause
The code was incorrectly accessing `.snapshot` (singular) on Project and ProjectMember objects, when the actual relationships are named `.snapshots` (plural).

## Changes Made

### File: backend/app/modules/member_snapshots/services.py

#### 1. Fixed calculate_member_workload method (lines 172-176)
**Before:**
```python
# Guard: project may not have a snapshot yet (first run for this project)
previous_project_total = (
    project.snapshot.total_workload_points
    if project.snapshot is not None
    else Decimal("0")
)
```

**After:**
```python
# Guard: project may not have a snapshot yet (first run for this project)
previous_project_total = (
    project.snapshots[-1].total_workload_points
    if project.snapshots
    else Decimal("0")
)
```

#### 2. Fixed check_workload_status method (lines 82-86)
**Before:**
```python
member_points = [
    member.snapshots[-1].total_effective_points
    for member in project_members
    if member.snapshot is not None
]
```

**After:**
```python
member_points = [
    member.snapshots[-1].total_effective_points
    for member in project_members
    if member.snapshots
]
```

## Explanation
- Both Project and ProjectMember models have `snapshots` relationships (one-to-many) to their respective snapshot models
- To access the latest snapshot, we use `[ -1 ]` on the snapshots list
- To check if snapshots exist, we evaluate the list directly (`if project.snapshots`) which is True for non-empty lists
- The fixes handle the case where no snapshots exist yet by defaulting to 0

## Verification
- All incorrect `.snapshot` references have been replaced with correct `.snapshots` usage
- The changes maintain the original logic flow while fixing the AttributeError
- No other files required modification based on the error trace and git status