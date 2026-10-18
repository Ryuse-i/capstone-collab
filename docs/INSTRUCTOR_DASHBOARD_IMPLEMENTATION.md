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
- Health status mapping (backend uses `healthy/watch/at_risk`, frontend expects `healthy/at_risk/critical`)
- Primary role by stage determination (needs stage model from backend)
- Pending submissions count per project (needs aggregation)
- "Currently your turn" concept (needs stage-based role mapping)
- Deadline data with notes (may need new endpoint or extension)
- Activity feed formatting (needs processing of raw comment data)

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
- No special dashboard-specific permissions needed - reuse existing project access patterns

## Data Mapping Table

| Dashboard element / field | Existing source (file path + symbol) | Fit: Ready / Needs adjustment / Notes |
|---------------------------|--------------------------------------|----------------------------------------|
| **Project list** (id, name) | `backend/app/modules/projects/repo.py:get_projects_for_instructor` | Ready - returns basic project info |
| **Project role** (instructor/advisor) | `backend/app/modules/project_members/model.py:ProjectMember.project_role` | Ready - available via project member query |
| **Stage ID** | `backend/app/modules/tasks/model.py:Task` (no explicit stage) | **Missing** - tasks don't have stage concept; need to derive from supertasks or create stage model |
| **Health status** | `backend/app/modules/project_health/project_health_service.py:calculate_project_health` | Needs adjustment - returns `healthy/watch/at_risk`, frontend expects `healthy/at_risk/critical` |
| **Progress %** | `backend/app/modules/project_snapshots/model.py:ProjectSnapshot.progress_percentage` | Ready - but requires snapshot service call |
| **Pending submissions** | `backend/app/modules/task_submissions/model.py:TaskSubmission` | Needs adjustment - requires counting submissions with `result = PENDING` per project |
| **Last activity** | `backend/app/modules/task_comments/model.py:TaskComment.created_at` | Ready - but requires aggregation per project |
| **Last activity time** (formatted) | Frontend formatting function | Ready - can reuse existing formatting |
| **Deadline data** (title, student name, note, days) | `backend/app/modules/tasks/model.py:Task` + `backend/app/modules/task_submissions/model.py` | Partial - has title/deadline but lacks student name/note; may need new endpoint |
| **Projects by stage** (bar chart) | Derived from task/supertask data | **Missing** - no explicit stage model in backend |
| **Recent activity feed** | `backend/app/modules/task_comments/model.py:TaskComment` | Needs adjustment - requires processing and limiting to recent items |

## Gap Analysis

### Derivable Fields
1. **Health Status Mapping**: Backend returns `healthy/watch/at_risk`; map to frontend:
   - `healthy` → `healthy`
   - `watch` → `at_risk` 
   - `at_risk` → `critical`
   *Rationale*: Backend's "watch" indicates emerging issues, matching frontend's "at_risk"; backend's "at_risk" indicates severe issues, matching frontend's "critical"

2. **Progress %**: Available from `ProjectSnapshot.progress_percentage` via snapshot service

3. **Pending Submissions**: Count of `TaskSubmission` records where `result = 'PENDING'` and submission belongs to tasks in the project

4. **Last Activity**: Most recent `TaskComment.created_at` or `TaskSubmission.submitted_at` for the project

5. **Primary Role by Stage**: 
   - **Assumption**: Backend doesn't have explicit stage model
   - **Proposed**: Use supertasks as stages (Proposal → Development → Testing & revision → Defense prep)
   - **Implementation**: 
     - Map supertask titles/names to stage labels
     - Determine primary role based on suptask assignment patterns or explicit fields
     - Fallback to hardcoded mapping if no better solution exists

### Required Schema/Endpoint Additions

1. **Stage Model** (if not using supertasks):
   - Add `stages` table: `id`, `label`, `primary_role` (instructor/advisor)
   - Add `project_stages` table: `project_id`, `stage_id`, `started_at`, `completed_at`
   - Or add `current_stage_id` to projects table

2. **Enhanced Project Endpoint**:
   - Extend `/projects/me/roles` to include:
     - Current stage (via join to project_stages or supertasks)
     - Health status (via join to project_health materialized view or calculated field)
     - Pending submission count (subquery or hybrid property)
     - Last activity timestamp (subquery or hybrid property)

3. **Deadlines Endpoint** (new):
   - GET `/dashboard/instructor/deadlines` with filters
   - Returns: upcoming task deadlines with student names, notes, days until due
   - Joins: tasks → submissions → users for student info
   - Includes: task title, note field (could use task description or custom field)

4. **Activity Feed Endpoint** (optional enhancement):
   - GET `/dashboard/instructor/activity` 
   - Returns: recent comments/submissions across advised/instructed projects
   - Could reuse admin activity service logic with project filtering

## Proposed Dashboard Changes

### Design Improvements
1. **Replace "Currently your turn"** → "Primary reviewer for current stage"
   - More accurate description of the guidance role
   - Based on actual stage-primary_role mapping

2. **Revise "Needs your attention" sorting**:
   - Keep health-based sorting but clarify meaning:
     - Critical: Immediate action needed (health = critical)
     - At risk: Should review soon (health = at_risk)
   - Add secondary sort by days overdue (from deadline data)

3. **Update Deadline Notes**:
   - Current mock notes are overly specific; replace with generic helpful text
   - Example: "Advisor sign-off needed before proceeding to next stage"
   - Source from task description or dedicated instructor_notes field

4. **Improve Activity Feed**:
   - Show meaningful actions: "Submitted literature review", "Commented on methodology"
   - Extract from task comments/submissions with truncation
   - Include timestamp with proper timezone handling

5. **Stage Model Source**:
   - If using supertasks: Fetch distinct supertasks for user's projects
   - Map supertask names to stage labels: "Proposal", "Development", etc.
   - If no supertasks exist, create stage configuration endpoint

### Bugs/Fixes in Mock Implementation
1. **Activity Feed Sorting**: Uses string comparison on `lastActivityTime` like "3h ago" → incorrect
   - Fix: Sort by actual timestamp datetime values

2. **Deadline Date Calculation**: Uses `daysFromNow` added to current date → no timezone handling
   - Fix: Use actual deadline timestamps from database with proper date formatting

3. **Health Logic**: Mock uses random assignment; real implementation should use project health service

## API Design

### Proposed Endpoint
**GET** `/dashboard/instructor` 
- Returns aggregated dashboard data for instructor/advisor
- Alternative: Keep existing endpoints and compose in frontend hook (preferred for flexibility)

### Response TypeScript Types
```typescript
interface InstructorDashboardProject {
  id: string;
  name: string;
  role: 'instructor' | 'advisor'; // User's role in this project
  stageId: number;
  stageLabel: string;
  health: 'healthy' | 'at_risk' | 'critical';
  progress: number; // 0-100
  pendingSubmissions: number;
  lastActivity: string; // Description of last activity
  lastActivityTime: string; // Formatted time ago (e.g., "2h ago")
  isPrimaryReviewer: boolean; // User is primary role for current stage
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
  stageLabel?: string;
}

interface InstructorDashboardStats {
  total: number;
  atRisk: number; // healthy/at_risk/critical where not healthy
  pendingReviews: number; // Sum of pendingSubmissions
  yourTurn: number; // Count where isPrimaryReviewer = true
}

interface InstructorDashboardResponse {
  projects: InstructorDashboardProject[];
  deadlines: InstructorDashboardDeadline[];
  stats: InstructorDashboardStats;
  stageDistribution: Array<{ stage: string; count: number }>;
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
- No additional permissions needed - instructors/advisors already have read access to their projects

## Frontend Integration Plan

### Hooks to Create
1. **`useInstructorProjects`** (`/frontend/src/hooks/useInstructorProjects.ts`)
   - Wrapper around `/projects/me/roles` endpoint
   - Enhances data with health, stage, submission counts
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

## Backend Implementation Steps

### Phase 1: Use Existing Data (Minimal Changes)
1. **Create dashboard router** (`/backend/app/modules/dashboard/router.py`)
2. **Implement `/projects/me/roles` enhancement**:
   - Modify to join with project health service for health scores
   - Add pending submission count via subquery
   - Add last activity timestamp via subquery
3. **Create health mapping layer**:
   - Map backend `healthy/watch/at_risk` to frontend `healthy/at_risk/critical`
4. **Update InstructorDashboard hook** to use enhanced projects endpoint

### Phase 2: Add Stage Support
1. **Determine stage approach**:
   - Option A: Use existing supertasks as stages (recommended - leverages existing model)
   - Option B: Create explicit stage model (more work but cleaner)
2. **If using supertasks**:
   - Add endpoint to get distinct supertasks for user's projects
   - Map supertask names to stage labels
   - Determine primary role per stage (may need new field or convention)
3. **If creating stage model**:
   - Create `stages` table and migration
   - Create `project_stages` table for per-project stage tracking
   - Add API endpoints for stage management

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
   - Minor adjustments for mapping
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
   - Test health status mapping function
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

## Phased Rollout

### Phase 1: Basic Project List with Health (Week 1)
- Enhance `/projects/me/roles` to include health scores and basic counts
- Update frontend to use new project data
- Replace mock projects with real data
- **Deliverable**: Functional project summary stats and list

### Phase 2: Stage and Deadline Integration (Week 2) 
- Implement stage detection (via supertasks or new model)
- Create deadlines endpoint with student names and notes
- Update frontend to show real deadline data
- **Deliverable**: Working summary stats, projects list, and deadlines section

### Phase 3: Activity Feed and Polish (Week 3)
- Implement activity feed from task comments/submissions
- Fix activity sorting to use real timestamps
- Polish UI copy and error states
- **Deliverable**: Complete dashboard matching mock functionality with real data

### Phase 4: Optimization and Feedback (Week 4)
- Performance testing and indexing review
- Collect user feedback on usefulness
- Make iterative improvements based on actual usage

## Risks, Open Questions, and Assumptions

### Risks
1. **Performance**: Health calculation is expensive; calling it for many projects could be slow
   - **Mitigation**: Cache health scores, calculate asynchronously, or show loading states

2. **Stage Model Ambiguity**: Backend lacks explicit stage concept
   - **Mitigation**: Use supertasks as proxy; gather feedback from stakeholders on accuracy

3. **Data Freshness**: Snapshot-based progress may be stale
   - **Mitigation**: Document limitation; consider real-time calculation if critical

### Open Questions
1. **Stage Source**: Should we use supertasks as stages or create explicit stage model?
   - Need to confirm with product/team leads what stages actually represent in the system

2. **Note Field Source**: Where should deadline "notes" come from?
   - Options: Task description, dedicated instructor_notes field, or generate from task properties

3. **Activity Definition**: What constitutes "activity" for the feed?
   - Currently: Task comments and submissions; should we include other events?

4. **Health Thresholds**: Backend health thresholds (80/60) match frontend?
   - Verified: Yes, both use 80+ healthy, 60-79 watch, <60 at_risk

### Assumptions
1. **Project Role Fields**: `projects.instructor_id` and `projects.advisor_id` are kept in sync with `project_members` table
   - If not, we'll need to rely solely on project_members for role detection

2. **Subtask Stage Mapping**: Supertask names/numbers correspond to the four stages
   - If not, we'll need a mapping table or configuration

3. **Pending Submission Definition**: A submission with `result = 'PENDING'` needs review
   - Confirmed with task submissions model and enum

4. **Activity Timestamp**: `TaskComment.created_at` represents meaningful activity
   - Reasonable assumption; alternative would be to use submission timestamps

5. **Instructor/Advisor Access**: Both roles should see same dashboard data
   - Based on current mock data not distinguishing roles; if different views needed, add role filtering
