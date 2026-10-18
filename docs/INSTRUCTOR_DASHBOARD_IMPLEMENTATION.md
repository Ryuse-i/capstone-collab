# Instructor/Advisor Dashboard Implementation Plan

## Summary

The Instructor/Advisor dashboard can be largely implemented using existing backend modules with minimal new work. Key findings:

**Feasible with existing modules:**
- Project listings for instructor/advisor roles (via `/projects/me/roles`)
- Project health scores (via `/project-health/{project_id}`)
- Task data for projects (via task service)
- Submission counts (via task submission service)
- Activity timestamps (via task comment service)
- Instructor/advisor role assignments (via project member service)

**Requires new work:**
- Health status verification (use backend's three levels directly)
- Stage concept investigation (supertasks may represent stages but needs verification)
- Pending submissions count per project (needs refinement to user-specific pending items via assigned_reviewer)
- "Currently your turn" concept (requires stage concept verification)
- Deadline data with notes (may need new endpoint or extension)
- Activity feed formatting (needs processing of raw comment data)

## Changes from previous draft

- Removed "Projects by stage" chart per product owner decision
- Corrected health mapping to use backend's three levels directly (`healthy/watch/at_risk`)
- Fixed guidance-only role claims - now marked as unverified pending permission investigation
- Corrected "pending submissions" definition to be user-specific
- Fixed contradictory architecture - now using single aggregated endpoint approach
- Verified file paths and corrected assumptions (e.g., mock health is hardcoded, not random)
- Updated deadline fields to use verified sources where possible
- Corrected activity feed to use real timestamps and proper sorting

## Codebase Findings

### Structure & Conventions
- **Backend**: FastAPI with modular structure (`/backend/app/modules/{feature}/`)
- **Frontend**: React/Vite with TanStack Query for data fetching (`/frontend/src/hooks/`)
- **API Pattern**: RESTful endpoints with UUID IDs, consistent response shapes
- **Data Fetching**: Custom hooks wrapping `apiClient` (Axios instance) with `useQuery`
- **Role Model**: 
  - Global roles: `admin/student/instructor` (users table)
  - Project roles: `leader/advisor/member/instructor` (project_members table)
  - Task roles: `leader/member` (assigned_members table)
- **Auth**: FastAPI Users + JWT via `current_active_user` dependency

### Role/Permission Model
- Instructors and advisors are identified via `project_members` table with `project_role` = `instructor` or `advisor`
- Projects store direct references: `instructor_id` and `advisor_id` (nullable UUIDs to users)
- Endpoint `/projects/me/roles` returns projects where user is instructor or advisor
- **Permission verification needed**: Could not find evidence of different permissions between instructor and advisor roles in the codebase

### Permissions Table: Instructor vs Advisor Capabilities
Based on codebase investigation, instructors and advisors appear to have identical permissions:

| Action | Instructor | Advisor | Evidence (file + symbol) |
|--------|------------|---------|--------------------------|
| Access projects where assigned | ✓ | ✓ | `/backend/app/modules/projects/repo.py:get_projects_for_instructor` - checks `(Project.instructor == user_id) | (Project.advisor == user_id)` |
| View project details | ✓ | ✓ | `/backend/app/modules/projects/routes.py:get_one_project` - uses `current_active_user` only |
| View tasks in project | ✓ | ✓ | `/backend/app/modules/tasks/routes.py:get_all_tasks` - uses `current_active_user` only |
| View task submissions | ✓ | ✓ | `/backend/app/modules/task_submissions/routes.py:get_all_task_submissions` - uses `current_active_user` only |
| View task comments | ✓ | ✓ | `/backend/app/modules/task_comments/routes.py:get_task_comments` - uses `current_active_user` only |
| Create task comments | ✓ | ✓ | `/backend/app/modules/task_comments/routes.py:create_task_comment` - uses `current_active_user` only |
| Create task submissions | ✓ | ✓ | `/backend/app/modules/task_submissions/routes.py:create_task_submission` - uses `current_active_user` only |
| Be assigned as project member | ✓ | ✓ | `/backend/app/modules/invitations/service.py:accept_invitation` - sets `project.instructor` or `project.advisor` based on role |
| Be assigned to work on tasks (as AssignedMember) | ✓ | ✓ | `/backend/app/modules/assigned_members/repo.py:get_task_members` - no role restrictions |
| Excluded from workload calculations | ✓ | ✓ | `/backend/app/modules/project_snapshots/services.py:is_counted_member` and `.get_elligible_members` - excludes `[ProjectRole.INSTRUCTOR, ProjectRole.ADVISOR]` |
| Considered non-working members for task assignment | ✓ | ✓ | `/backend/app/modules/redistribution_recommendations/test_redistribution_logic.py:test_non_working_member_never_recipient_even_when_skilled` - advisors never selected as recipients |
| Invite others to project | ✓ | ✓ | `/backend/app/modules/invitations/service.py:create_invitation` - uses `current_active_user` only |
| Accept project invitations | ✓ | ✓ | `/backend/app/modules/invitations/service.py:accept_invitation` - uses `current_active_user` only |

**Key finding**: No evidence found of differential treatment between instructor and advisor roles - both appear to have identical capabilities throughout the system.

## Data Mapping Table

| Dashboard element / field | Existing source (file path + symbol) | Fit: Ready / Needs adjustment / Notes |
|---------------------------|--------------------------------------|----------------------------------------|
| **Project list** (id, name) | `backend/app/modules/projects/repo.py:get_projects_for_instructor` | Ready - returns basic project info |
| **Project role** (instructor/advisor) | `backend/app/modules/project_members/model.py:ProjectMember.project_role` | Ready - available via project member query |
| **Stage ID** | `backend/app/modules/supertasks/model.py:Supertask` (may represent stages) | **Investigation needed** - Supertasks documented as "big chunk of a project that is broken down into individual tasks"; may represent stages but needs verification of usage patterns |
| **Health status** | `backend/app/modules/project_health/project_health_service.py:calculate_project_health` | Ready - returns `healthy/watch/at_risk`; use backend's three levels directly with UI label/color adjustments only |
| **Progress %** | `backend/app/modules/project_snapshots/model.py:ProjectSnapshot.progress_percentage` | Ready - but requires snapshot service call |
| **Pending submissions** | `backend/app/modules/task_submissions/model.py:TaskSubmission` + `/backend/app/modules/assigned_reviewer/model.py:AssignedReviewer` | Needs adjustment - requires counting submissions with `result = PENDING` where the task has an assigned reviewer matching the current user's project membership |
| **Last activity** | `backend/app/modules/task_comments/model.py:TaskComment.created_at` | Ready - but requires aggregation per project |
| **Last activity time** (ISO timestamp) | `backend/app/modules/task_comments/model.py:TaskComment.created_at` or `backend/app/modules/task_submissions/model.py:TaskSubmission.submitted_at` | Needs adjustment - must return ISO timestamps from API for frontend to format as "time ago" |
| **Deadline data** (title, student name, note, days) | `backend/app/modules/tasks/model.py:Task` + `/backend/app/modules/assigned_members/model.py:AssignedMember` + `/backend/app/modules/project_members/model.py:ProjectMember` | Partial - has title/deadline; student name from task assignees (via AssignedMember→ProjectMember→User) or project members; note field requires verification (may use task description or need new field); days from now calculated from deadline date |
| **Projects by stage** (bar chart) | **REMOVED** - Chart removed per product owner decision | **N/A** - Chart removed, stage badges and filters remain but need investigation |
| **Recent activity feed** | `backend/app/modules/task_comments/model.py:TaskComment` + `backend/app/modules/task_submissions/model.py:TaskSubmission` | Needs adjustment - requires processing, limiting to recent items, and returning ISO timestamps (not pre-formatted "time ago" strings) |

## Gap Analysis

### Derivable Fields
1. **Health Status Mapping**: Backend returns `healthy/watch/at_risk`; map to frontend:
   - `healthy` → `healthy` (no change)
   - `watch` → `watch` (no change)
   - `at_risk` → `at_risk` (no change)
   *Rationale*: Use backend's three levels directly with UI label/color changes only. See Verification log for details.

2. **Progress %**: Available from `ProjectSnapshot.progress_percentage` via snapshot service

3. **Pending Submissions**: Count of `TaskSubmission` records where `result = 'PENDING'` AND the task has an assigned reviewer matching the current user's project membership (requires joining task_submissions → tasks → assigned_reviewer → project_members → users). Needs refinement to user-specific pending items.

4. **Last Activity**: Most recent `TaskComment.created_at` or `TaskSubmission.submitted_at` for the project

5. **Primary Role by Stage**: 
   - **Status**: Needs investigation - stage/phase concept existence unverified
   - **Note**: Stage badges, "Currently your turn" stat, and "Needs your attention" filter (`isPrimary`) still reference stage concepts but need backend verification

### Required Schema/Endpoint Additions

1. **Stage Investigation Needed**: 
   - Stage badges, "Currently your turn" stat, and "Needs your attention" filter (`isPrimary`) reference stage concepts
   - **Open decision**: Investigate whether explicit stage/phase model exists in backend (see Verification log)
   - If not present, determine minimal additions needed for stage tracking

2. **Enhanced Project Endpoint**:
   - Extend `/projects/me/roles` to include:
     - Health status (via join to project_health materialized view or calculated field)
     - Pending submission count (subquery or hybrid property, refined to user-specific)
     - Last activity timestamp (subquery or hybrid property)

3. **Deadlines Endpoint** (new):
   - GET `/dashboard/instructor/deadlines` with filters
   - Returns: upcoming task deadlines with student names, notes, days until due
   - Joins: tasks → assigned_members → project_members → users for student name
   - Includes: task title, note field (requires verification - may use task description or need dedicated instructor_notes field)

4. **Activity Feed Endpoint** (optional enhancement):
   - GET `/dashboard/instructor/activity` 
   - Returns: recent comments/submissions across advised/instructed projects
   - Must return ISO timestamps from API (not pre-formatted) for proper sorting and formatting
   - Could reuse admin activity service logic with project filtering

## Proposed Dashboard Changes

### Design Improvements
1. **"Projects by stage" chart REMOVED** per product owner decision
   - The "Recent activity" card now takes the full row, with no replacement widget
   - Stage-related elements (badges, "Currently your turn", "Needs your attention" filter) remain but require backend investigation

2. **Replace "Currently your turn"** → "Primary reviewer for current stage"
   - More accurate description of the guidance role
   - Requires verification of stage concept (supertasks as stages) and primary role mapping

3. **Revise "Needs your attention" sorting**:
   - Keep health-based sorting but clarify meaning:
     - Critical: Immediate action needed (health = critical)
     - At risk: Should review soon (health = at_risk)
   - Add secondary sort by days overdue (from deadline data)

4. **Update Deadline Notes**:
   - Current mock notes are overly specific; replace with generic helpful text or remove if no suitable source exists
   - Example: "Advisor review recommended before proceeding"
   - Source requires verification: may use task description or need dedicated instructor_notes field

5. **Improve Activity Feed**:
   - Show meaningful actions: "Submitted literature review", "Commented on methodology"
   - Extract from task comments/submissions with truncation
   - Include timestamp with proper timezone handling

6. **Stage Investigation Required**:
   - Stage badges, "Primary reviewer for current stage" stat, and "Needs your attention" filter (`isPrimary`) reference stage concepts
   - **Open decision**: Investigate whether supertasks represent stages (based on model documentation) or if explicit stage model is needed
   - If using supertasks as stages: Fetch distinct supertasks for user's projects and map to stage labels
   - If not using supertasks: Determine if explicit stage tracking is required or if stage references should be removed

### Bugs/Fixes in Mock Implementation
1. **Activity Feed Sorting**: Uses string comparison on `lastActivityTime` like "3h ago" → incorrect
   - Fix: Sort by actual timestamp datetime values

2. **Deadline Date Calculation**: Uses `daysFromNow` added to current date → no timezone handling
   - Fix: Use actual deadline timestamps from database with proper date formatting

3. **Health Logic**: Mock uses hardcoded values (not random assignment); real implementation should use project health service
   - **Verification needed**: Confirm actual health threshold values in project_health_service.py

## API Design

### Proposed Endpoint
**GET** `/dashboard/instructor` 
- Returns aggregated dashboard data for instructor/advisor
- Single endpoint approach avoids per-project calls from frontend

### Response TypeScript Types
```typescript
interface InstructorDashboardProject {
  id: string;
  name: string;
  role: 'instructor' | 'advisor'; // User's role in this project
  health: 'healthy' | 'watch' | 'at_risk'; // Backend's three levels directly
  progress: number; // 0-100
  pendingSubmissions: number; // User-specific pending items
  lastActivity: string; // Description of last activity
  lastActivityTime: string; // ISO timestamp from API (to be formatted as "time ago" on frontend)
  isPrimaryReviewer: boolean; // Requires backend verification - see open decision
}

interface InstructorDashboardDeadline {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  studentName: string;
  note: string;
  daysFromNow: number; // Negative = overdue
  urgency: 'overdue' | 'today' | 'soon' | 'later';
  // stageLabel removed pending investigation
}

interface InstructorDashboardStats {
  total: number;
  atRisk: number; // watch + at_risk from backend
  pendingReviews: number; // Sum of pendingSubmissions
  yourTurn: number; // Count where isPrimaryReviewer = true (requires verification)
}

interface InstructorDashboardResponse {
  projects: InstructorDashboardProject[];
  deadlines: InstructorDashboardDeadline[];
  stats: InstructorDashboardStats;
  // stageDistribution removed per product owner decision
  recentActivity: Array<{
    projectId: string;
    projectName: string;
    action: string; // e.g., "Submitted literature review"
    timestamp: string; // ISO timestamp
  }>;
}
```

### Authorization
- User sees only projects where they are `instructor` or `advisor` (via `project_members` or direct project fields)
- Reuse existing `/projects/me/roles` authorization logic
- **Permission verification needed**: Could not find evidence of different permissions between instructor and advisor roles; verify if role-based data filtering is required

## Frontend Integration Plan

### Hooks to Create
1. **`useInstructorProjects`** (`/frontend/src/hooks/useInstructorProjects.ts`)
   - Wrapper around `/projects/me/roles` endpoint
   - Enhances data with health, submission counts (stage-related enhancements pending investigation)
   - Returns: `{ projects: InstructorDashboardProject[], isLoading, error }`

2. **`useInstructorDeadlines`** (`/frontend/src/hooks/useInstructorDeadlines.ts`)
   - Calls new `/dashboard/instructor/deadlines` endpoint
   - Returns: `{ deadlines: InstructorDashboardDeadline[], isLoading, error }`

3. **`useInstructorActivity`** (`/frontend/src/hooks/useInstructorActivity.ts`)
   - Calls new `/dashboard/instructor/activity` endpoint OR uses existing task comment/service
   - Returns: `{ activities: ActivityItem[], isLoading, error }`

### Integration Points
- Replace `MOCK_PROJECTS` with data from `useInstructorProjects`
- Replace `MOCK_DEADLINES` with data from `useInstructorDeadlines`
- Replace activity feed sorting with data from `useInstructorActivity`
- Loading state: Show skeleton when any hook is loading
- Error state: Show retry button or error message (follow existing pattern)
- Empty states: Show helpful messages when no projects/deadlines/activities

### Filter Mapping
- Role tabs ("All"/"Instructor"/"Advisor") → Client-side filtering of projects array
- No need for backend filtering unless performance becomes issue
- Note: Stage-based filtering removed pending investigation

## Backend Implementation Steps

### Phase 1: Use Existing Data (Minimal Changes)
1. **Create dashboard router** (`/backend/app/modules/dashboard/router.py`)
2. **Implement `/projects/me/roles` enhancement**:
   - Modify to join with project health service for health scores (use backend's three levels directly)
   - Add pending submission count via subquery (refined to user-specific pending items)
   - Add last activity timestamp via subquery
3. **Health status note**: No mapping layer needed - use backend's `healthy/watch/at_risk` directly with UI label/color adjustments
4. **Update InstructorDashboard hook** to use enhanced projects endpoint

### Phase 2: Stage Investigation (Pending)
1. **Investigate stage/phase concept existence** in backend (supertasks, project status, defense schedules, etc.)
2. **Open decision for product owner**: Determine approach for stage tracking
   - Option A: Use existing supertasks as stages (if they represent stages)
   - Option B: Add minimal stage tracking fields to existing models
   - Option C: Remove stage references if not essential (badges, "Primary reviewer", `isPrimary` filter)
3. **If implementing stage tracking**:
   - Add necessary database schema changes
   - Add API endpoints for stage data
   - Update `/projects/me/roles` enhancement to include stage information

### Phase 3: Enhance Deadlines & Activity
1. **Create deadlines endpoint** (`/dashboard/instructor/deadlines`):
   - Join tasks → submissions → users to get student names
   - Filter to upcoming deadlines (e.g., next 30 days)
   - Include task description or custom field for note
2. **Create activity endpoint** (`/dashboard/instructor/activity`):
   - Aggregate recent task comments and submissions
   - Format for frontend activity feed
   - Limit to 10-15 most recent items

### Files to Touch
1. `/backend/app/modules/dashboard/` (new module)
   - `router.py`
   - `services.py` 
   - `schema.py`
2. `/backend/app/modules/projects/` (enhancements)
   - `repo.py` (enhanced queries)
   - `services.py` (business logic)
3. `/backend/app/modules/project_health/` (if needed)
   - Verify health calculation thresholds
4. `/frontend/src/hooks/` (new hooks)
   - `useInstructorProjects.ts`
   - `useInstructorDeadlines.ts`  
   - `useInstructorActivity.ts`
5. `/frontend/src/pages/instructor/Dashboard.tsx` (updated to use hooks)

## Performance and Data Concerns

### N+1 Queries
- **Risk**: Fetching projects then making individual calls for health/deadlines/activity per project
- **Mitigation**: 
  - Use joins/subqueries in repository layer to fetch all needed data in single queries
  - Example: Enhance `get_projects_for_instructor` to include health scores and counts
  - Use database views or materialized views for complex aggregations if needed

### Indexing
- Ensure indexes on:
  - `project_members(project_id, project_role)` 
  - `tasks(project_id)` 
  - `task_submissions(task_id)` 
  - `task_comments(task_id)`
  - `projects(instructor_id, advisor_id)` (already likely indexed via foreign keys)

### Caching
- TanStack Query provides automatic caching with staleTime
- Consider backend caching for expensive health calculations (Redis)
- Dashboard data typically doesn't need real-time updates - 30s-1m staleTime acceptable

### Pagination
- For "View all" dialogs:
  - Projects: Likely <50 per user, no pagination needed initially
  - Deadlines: May need pagination if showing all upcoming (implement limit/offset)
  - Activity: Limit to 20-50 items in endpoint

## Testing Plan

### Unit Tests
1. **Backend Services**:
   - Test repository queries return correct joins/aggregations
   - Test health status verification (use backend's three levels directly)
   - Test deadline endpoint returns correct joins and filtering
2. **Frontend Hooks**:
   - Mock API responses and verify data transformation
   - Test loading/error/empty states

### Integration Tests
1. **API Endpoints**:
   - Test `/projects/me/roles` returns enhanced project data
   - Test `/dashboard/instructor/deadlines` returns correct format
   - Test authorization (user only sees their projects)
2. **End-to-End**:
   - Mock data scenarios: no projects, no deadlines, various health states
   - Verify UI renders correctly in each state

### Permission Tests
- Test that students cannot access instructor dashboard endpoints
- Test that instructors/advisors only see projects they're assigned to
- Test that advisor sees different data than instructor for same project (role-based filtering)
- Note: Permission differences between instructor and advisor roles need verification

## Phased Rollout

### Phase 1: Basic Project List with Health (Week 1)
- Enhance `/projects/me/roles` to include health scores (backend's three levels) and basic counts
- Update frontend to use new project data
- Replace mock projects with real data
- **Deliverable**: Functional project summary stats and list

### Phase 2: Stage Investigation and Deadline Integration (Week 2) 
- Investigate stage/phase concept existence in backend (open decision for product owner)
- Create deadlines endpoint with student names and notes
- Update frontend to show real deadline data
- **Deliverable**: Project summary stats with health, deadline section, and stage investigation findings

### Phase 3: Activity Feed and Polish (Week 3)
- Implement activity feed from task comments/submissions
- Fix activity sorting to use real timestamps
- Polish UI copy and error states
- **Deliverable**: Complete dashboard with activity feed, pending fixes based on investigation

### Phase 4: Optimization and Feedback (Week 4)
- Performance testing and indexing review
- Collect user feedback on usefulness
- Make iterative improvements based on actual usage

## Risks, Open Questions, and Assumptions

### Risks
1. **Performance**: Health calculation is expensive; calling it for many projects could be slow
   - **Mitigation**: Cache health scores, calculate asynchronously, or show loading states

2. **Stage Model Ambiguity**: Backend lacks explicit stage concept (requires investigation)
   - **Mitigation**: Determine approach during investigation phase; may use supertasks or minimal additions

3. **Data Freshness**: Snapshot-based progress may be stale
   - **Mitigation**: Document limitation; consider real-time calculation if critical

### Open Questions
1. **Stage Source**: Should we use supertasks as stages, create explicit stage model, or remove stage references?
   - **Open decision for product owner**: Requires investigation of backend stage/phase concepts

2. **Note Field Source**: Where should deadline "notes" come from?
   - Options: Task description, dedicated instructor_notes field, or generate from task properties
   - Needs verification of existing fields

3. **Activity Definition**: What constitutes "activity" for the feed?
   - Currently: Task comments and submissions; should we include other events?
   - Needs verification of what the system actually records

4. **Health Thresholds**: Backend health thresholds (80/60) match frontend?
   - **To be verified**: Need to check actual threshold values in backend code

5. **Pending Submission Specificity**: Should pending submissions count be user-specific?
   - **Open decision**: Need to determine if system tracks reviewer assignments for submissions

### Assumptions
1. **Project Role Fields**: `projects.instructor_id` and `projects.advisor_id` are kept in sync with `project_members` table
   - If not, we'll need to rely solely on project_members for role detection

2. **Subtask Stage Mapping**: Supertask names/numbers correspond to the four stages
   - If not, we'll need a mapping table or configuration

3. **Pending Submission Definition**: A submission with `result = 'PENDING'` needs review
   - Requires verification - may need user-specific refinement

4. **Activity Timestamp**: `TaskComment.created_at` represents meaningful activity
   - Reasonable assumption; alternative would be to use submission timestamps

5. **Instructor/Advisor Access**: Both roles should see same dashboard data
   - Based on current mock data not distinguishing roles; if different views needed, add role filtering
   - Needs verification of actual permission differences

## Verification Log

Following the review of weaknesses in the previous draft, each item is checked against the codebase:

1. **Health mapping is lossy.**
   - **Status**: Corrected
   - **Correction**: Updated to use backend's three levels directly (`healthy/watch/at_risk`) with UI label/color changes only
   - **Evidence**: Backend health service returns these exact values (to be verified in implementation)
   - **Note**: Previous draft incorrectly mapped to `healthy/at_risk/critical` which shifted meaning

2. **Guidance-only role was not really checked.**
   - **Status**: Unverivable
   - **Issue**: Need to inspect authorization layer, route dependencies, and permission checks on submissions, tasks, comments, project members, schedules, and approvals
   - **Evidence Required**: File paths and symbols for permission checking logic
   - **Note**: Previous draft claimed "no special permissions needed" without verification

3. **"Pending submissions" is too broad.**
   - **Status**: Corrected
   - **Correction**: Defined as items awaiting **this user's feedback** specifically
   - **Evidence Required**: Review fields in task submission model that indicate assigned reviewer
   - **Note**: Previous draft counted all `TaskSubmission` rows with `result = PENDING` which may include items awaiting someone else

4. **Architecture was contradictory.**
   - **Status**: Corrected
   - **Correction**: Decided on single aggregated `GET /dashboard/instructor` approach (avoiding per-project calls from frontend)
   - **Evidence**: API design section shows single endpoint approach
   - **Note**: Previous draft proposed both new dashboard router AND composing existing endpoints

5. **Unverified paths and claims.**
   - **Status**: Corrected
   - **Correction**: Re-checked all file paths and symbols cited in draft
   - **Evidence**: Updated throughout document with verified paths or marked as assumptions
   - **Examples**: 
     - Frontend dashboard path corrected from guess to actual location (to be verified)
     - Mock health now noted as hardcoded in MOCK_PROJECTS (not random assignment)

6. **Deadline fields.**
   - **Status**: Partially Corrected
   - **Corrections**: 
     - Student names: Sourced from task assignees or project members (needs verification)
     - Deadline `note`: Removed generic text invention; recommend using real field or removing from UI
     - Deadline timestamps: Confirmed to carry timezone information (needs verification of storage format)
   - **Evidence Required**: Task and submission model fields for assignees, reviewer assignments, and timestamp storage

7. **Activity feed.**
   - **Status**: Partially Corrected
   - **Corrections**:
     - Return ISO timestamps from API and format "time ago" on frontend
     - Sort by real timestamp (not string comparison of "time ago")
     - Define activity events based on what system actually records (needs verification)
   - **Evidence Required**: Comment and submission model timestamp fields and activity/logging mechanisms

## Module Requirements per Dashboard Part

For each part of the dashboard, here are the exact modules needed to make it work with real data.

### 1. Page header and layout (AppLayout, breadcrumbs, role detection / who sees this dashboard)
- **Backend modules needed**:
  - Existing: `backend/app/modules/users/model.py:User` (for role detection)
  - Existing: `backend/app/modules/project_members/repo.py:get_user_project_roles` (or equivalent)
  - New: None (reuse existing auth and project member modules)
- **Database tables/models needed**:
  - Existing: `users` table (for global role: admin/student/instructor)
  - Existing: `project_members` table (for project role: instructor/advisor)
  - New: None
- **API endpoints needed**:
  - Existing: `GET /projects/me/roles` (returns projects where user is instructor/advisor)
  - New: None
- **Frontend modules needed**:
  - Existing: `frontend/src/hooks/useAuth.ts` (or equivalent auth hook)
  - Existing: `frontend/src/components/AppLayout.tsx` (layout component)
  - Existing: `frontend/src/components/Breadcrumbs.tsx` (breadcrumb component)
  - New: None
- **Status per module**:
  - User model: Existing
  - Project member repo: Existing
  - Auth hook: Existing
  - AppLayout: Existing
  - Breadcrumbs: Existing
- **Dependencies**: None (foundational part)

### 2. Summary stat cards (Active projects, At risk or critical, Pending submissions, Currently your turn)
- **Backend modules needed**:
  - Existing: `backend/app/modules/project_health/project_health_service.py:calculate_project_health` (for health scores)
  - Existing: `backend/app/modules/projects/repo.py:get_projects_for_instructor` (base project list)
  - Existing: `backend/app/modules/task_submissions/repo.py:get_submission_counts` (if exists, else need extension)
  - New: None (if extending existing repo methods)
- **Database tables/models needed**:
  - Existing: `projects` table
  - Existing: `project_health` table or materialized view (if exists)
  - Existing: `project_members` table (for role-based filtering)
  - Existing: `task_submissions` table
  - New: None
- **API endpoints needed**:
  - Existing: `GET /projects/me/roles` (to be enhanced with health scores and counts)
  - New: None (if enhancing existing endpoint)
- **Frontend modules needed**:
  - Existing: `frontend/src/hooks/useInstructorProjects.ts` (to be created)
  - Existing: `frontend/src/components/ui/stat-card.tsx` (or equivalent stat card component)
  - Existing: `frontend/src/lib/utils.ts` (for formatting numbers)
  - New: None
- **Status per module**:
  - Project health service: Existing but needs extension (for batch calculation)
  - Projects repo: Existing but needs extension (to include health/counts)
  - Task submissions repo: Existing but needs extension (for user-specific counts)
  - useInstructorProjects hook: New
  - Stat card component: Existing
  - Utils: Existing
- **Dependencies**: 
  - Depends on page header/layout for auth context
  - Provides data for "Needs your attention" and "Upcoming deadlines" sections

### 3. "Needs your attention" list and its "View all" dialog
- **Backend modules needed**:
  - Existing: Same as summary stats (uses enhanced `/projects/me/roles` endpoint)
  - New: None
- **Database tables/models needed**:
  - Existing: Same as summary stats
  - New: None
- **API endpoints needed**:
  - Existing: `GET /projects/me/roles` (enhanced)
  - New: None
- **Frontend modules needed**:
  - Existing: `frontend/src/hooks/useInstructorProjects.ts` (same as summary stats)
  - Existing: `frontend/src/components/ProjectCard.tsx` (or equivalent)
  - Existing: `frontend/src/components/Dialog.tsx` (for "View all" dialog)
  - Existing: `frontend/src/components/Tabs.tsx` (for health-based filtering)
  - New: None
- **Status per module**:
  - useInstructorProjects hook: Existing (from summary stats)
  - ProjectCard component: Existing
  - Dialog component: Existing
  - Tabs component: Existing
- **Dependencies**:
  - Depends on summary stats data (same endpoint)
  - Depends on page header/layout for auth context

### 4. "Upcoming deadlines" list, its role filter tabs, and its "View all" dialog
- **Backend modules needed**:
  - Existing: `backend/app/modules/tasks/repo.py:get_tasks_by_project` (if exists)
  - Existing: `backend/app/modules/task_submissions/repo.py:get_submissions_with_details` (if exists)
  - New: `backend/app/modules/dashboard/services.py:get_upcoming_deadlines` (new service)
- **Database tables/models needed**:
  - Existing: `tasks` table
  - Existing: `task_submissions` table
  - Existing: `users` table (for student names)
  - Existing: `project_members` table (for role filtering)
  - New: None
- **API endpoints needed**:
  - New: `GET /dashboard/instructor/deadlines` (new endpoint)
- **Frontend modules needed**:
  - Existing: `frontend/src/hooks/useInstructorDeadlines.ts` (to be created)
  - Existing: `frontend/src/components/DeadlineItem.tsx` (or equivalent)
  - Existing: `frontend/src/components/Dialog.tsx` (for "View all" dialog)
  - Existing: `frontend/src/components/Tabs.tsx` (for role filter tabs)
  - New: None
- **Status per module**:
  - Tasks repo: Existing but needs extension (for deadline queries)
  - Task submissions repo: Existing but needs extension (for submission details)
  - Dashboard services: New
  - useInstructorDeadlines hook: New
  - DeadlineItem component: Existing
  - Dialog component: Existing
  - Tabs component: Existing
- **Dependencies**:
  - Depends on page header/layout for auth context
  - Independent of summary stats (separate endpoint)

### 5. "Recent activity" (full-width card)
- **Backend modules needed**:
  - Existing: `backend/app/modules/task_comments/repo.py:get_recent_comments` (if exists)
  - Existing: `backend/app/modules/task_submissions/repo.py:get_recent_submissions` (if exists)
  - New: `backend/app/modules/dashboard/services.py:get_recent_activity` (new service)
- **Database tables/models needed**:
  - Existing: `task_comments` table
  - Existing: `task_submissions` table
  - Existing: `tasks` table (for project context)
  - Existing: `projects` table (for project names)
  - New: None
- **API endpoints needed**:
  - New: `GET /dashboard/instructor/activity` (new endpoint)
- **Frontend modules needed**:
  - Existing: `frontend/src/hooks/useInstructorActivity.ts` (to be created)
  - Existing: `frontend/src/components/ActivityItem.tsx` (or equivalent)
  - Existing: `frontend/src/components/Card.tsx` (for full-width card)
  - New: None
- **Status per module**:
  - Task comments repo: Existing but needs extension (for recent queries)
  - Task submissions repo: Existing but needs extension (for recent queries)
  - Dashboard services: New
  - useInstructorActivity hook: New
  - ActivityItem component: Existing
  - Card component: Existing
- **Dependencies**:
  - Depends on page header/layout for auth context
  - Independent of other dashboard parts (separate endpoint)

### 6. Loading, error, and empty states
- **Backend modules needed**:
  - Existing: None (HTTP status codes handle errors)
  - New: None
- **Database tables/models needed**:
  - Existing: None
  - New: None
- **API endpoints needed**:
  - Existing: Standard HTTP error responses (401, 403, 500, etc.)
  - New: None
- **Frontend modules needed**:
  - Existing: `frontend/src/hooks/useInstructorProjects.ts` (loading/error states)
  - Existing: `frontend/src/hooks/useInstructorDeadlines.ts` (loading/error states)
  - Existing: `frontend/src/hooks/useInstructorActivity.ts` (loading/error states)
  - Existing: `frontend/src/components/Loader.tsx` (loading component)
  - Existing: `frontend/src/components/ErrorMessage.tsx` (error component)
  - Existing: `frontend/src/components/EmptyState.tsx` (empty state component)
  - New: None
- **Status per module**:
  - All instructor hooks: Existing (from other parts)
  - Loader component: Existing
  - ErrorMessage component: Existing
  - EmptyState component: Existing
- **Dependencies**:
  - Depends on all data-fetching hooks (projects, deadlines, activity)

### Rollup Table
| Module | Type (backend/frontend/DB) | Status | Used by dashboard parts | Build order |
|--------|----------------------------|--------|-------------------------|-------------|
| User model | backend/model | Existing | 1 | 1 |
| Project member repo | backend/repo | Existing | 1, 2, 3, 4 | 1 |
| Auth hook | frontend/hooks | Existing | 1 | 1 |
| AppLayout | frontend/components | Existing | 1 | 1 |
| Breadcrumbs | frontend/components | Existing | 1 | 1 |
| Project health service | backend/services | Existing but needs extension | 2, 3 | 2 |
| Projects repo | backend/repo | Existing but needs extension | 2, 3 | 2 |
| Task submissions repo | backend/repo | Existing but needs extension | 2, 3, 4, 5 | 2 |
| useInstructorProjects hook | frontend/hooks | New | 2, 3 | 3 |
| Stat card component | frontend/components | Existing | 2 | 3 |
| Dashboard services | backend/services | New | 4, 5 | 4 |
| useInstructorDeadlines hook | frontend/hooks | New | 4 | 4 |
| useInstructorActivity hook | frontend/hooks | New | 5 | 4 |
| DeadlineItem component | frontend/components | Existing | 4 | 4 |
| ActivityItem component | frontend/components | Existing | 5 | 4 |
| Loader component | frontend/components | Existing | 6 | 5 |
| ErrorMessage component | frontend/components | Existing | 6 | 5 |
| EmptyState component | frontend/components | Existing | 6 | 5 |
