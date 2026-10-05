# Admin Dashboard — Analysis, Design, and Implementation Plan

## Phase 1: Analysis of the current repo

### Backend findings

#### 1) User model, roles, and enum integrity
- The current global user enum is in [backend/app/modules/users/model.py](backend/app/modules/users/model.py): `UserRole.ADMIN`, `UserRole.STUDENT`, and `UserRole.INSTRUCTOR`.
- There is no `UserRole.ADVISOR` in the backend user model. The `advisor` concept in this app is currently a project-level relationship, not a global user role:
  - `Project.advisor` exists in [backend/app/modules/projects/model.py](backend/app/modules/projects/model.py)
  - `ProjectRole` includes `LEADER`, `ADVISOR`, `MEMBER`, and `INSTRUCTOR` in [backend/app/modules/project_members/model.py](backend/app/modules/project_members/model.py)
- Important mismatch to fix: the frontend `ROLES` object includes `ADVISOR` in [frontend/src/constants/roles.ts](frontend/src/constants/roles.ts), while backend global user roles do not. That is a design distinction the admin dashboardmust preserve: `admin` is a user role; `advisor` is a project-role or project relationship.
- The current `role` column is stored as a PostgreSQL enum using SQLAlchemy `SAENUM(UserRole, name="user_role")`. If we add a new enum value later, we must handle PostgreSQL enum migration carefully with safe ALTER TYPE logic instead of dropping/recreating blindly.

#### 2) Auth and JWT flow
- Auth setup is in [backend/app/modules/users/auth.py](backend/app/modules/users/auth.py) and [backend/app/modules/users/manager.py](backend/app/modules/users/manager.py).
- JWT is created by `fastapi_users` with `JWTStrategy(secret=settings.SECRET_KEY, lifetime_seconds=settings.ACCESS_TOKEN_EXPIRE_SECONDS)` from [backend/app/core/config.py](backend/app/core/config.py).
- Refresh tokens are stored in the `refresh_tokens` table via a custom `RefreshToken` model in [backend/app/modules/users/model.py](backend/app/modules/users/model.py).
- Custom auth routes are in [backend/app/modules/users/routes.py](backend/app/modules/users/routes.py):
  - `POST /auth/jwt/login`
  - `POST /auth/jwt/logout`
  - `POST /auth/refresh-token`
  - `GET /users/me/profile`
- FastAPI Users also mounts these standard routes:
  - register
  - users CRUD
  - reset password
  - email verification
- Access tokens and refresh tokens are both returned by login and refresh route; refresh tokens are hashed before storing. The code currently checks `user.is_active` on login and refresh, but there is no custom `require_admin` dependency and no global admin guard yet.
- There is no explicit login event table, last_login tracking, or audit trail for admin actions.

#### 3) BaseRepo and module conventions
- The repo follows a consistent layered structure: `model.py` + `schema.py` + `services.py` + `routes.py` + often `repo.py` and/or `manager.py`. Good examples:
  - [backend/app/modules/projects](backend/app/modules/projects)
  - [backend/app/modules/tasks](backend/app/modules/tasks)
  - [backend/app/modules/project_members](backend/app/modules/project_members)
  - [backend/app/modules/invitations](backend/app/modules/invitations)
- Shared CRUD base logic lives in [backend/app/core/base_repo.py](backend/app/core/base_repo.py). It follows the project pattern of repo-init, then service-layer orchestration, then route handlers.
- Route registration is centralized in [backend/app/api/api.py](backend/app/api/api.py); adding admin routes this way will match the architecture.

#### 4) Existing user-related routes and endpoints that can be reused or extended
- Existing auth and user endpoints already cover login, refresh, password reset, verification, and reading/updating the current user.
- The strongest reusable pieces are:
  - custom login/logout/refresh code in [backend/app/modules/users/routes.py](backend/app/modules/users/routes.py)
  - `current_active_user = fastapi_users.current_user(active=True)` in [backend/app/modules/users/services.py](backend/app/modules/users/services.py)
  - `UserResponse` and `UserCreate` schema in [backend/app/modules/users/schema.py](backend/app/modules/users/schema.py)
  - `UserManager` in [backend/app/modules/users/manager.py](backend/app/modules/users/manager.py)
- There is no admin-only route protection yet. This should be added as a new dependency, not by widening user routes.

#### 5) Existing data that can feed metrics
The app already has several tables and enums which can support a metrics layer without new tables:
- Users: [backend/app/modules/users/model.py](backend/app/modules/users/model.py)
- Projects: [backend/app/modules/projects/model.py](backend/app/modules/projects/model.py)
- Project members and project roles: [backend/app/modules/project_members/model.py](backend/app/modules/project_members/model.py)
- Tasks and status/priority/complexity enums: [backend/app/modules/tasks/model.py](backend/app/modules/tasks/model.py), [backend/app/modules/tasks/enums.py](backend/app/modules/tasks/enums.py)
- Project snapshots: [backend/app/modules/project_snapshots/model.py](backend/app/modules/project_snapshots/model.py)
- Member snapshots and workload status: [backend/app/modules/member_snapshots/model.py](backend/app/modules/member_snapshots/model.py)
- Invitations: [backend/app/modules/invitations/model.py](backend/app/modules/invitations/model.py)
- Stored files and uploads: [backend/app/modules/files/model.py](backend/app/modules/files/model.py)
- AI complexity scoring: [backend/app/modules/ai/service.py](backend/app/modules/ai/service.py) and [backend/app/modules/ai/client.py](backend/app/modules/ai/client.py)
- Task attachments: [backend/app/modules/task_attachments/model.py](backend/app/modules/task_attachments/model.py)

What is not present today:
- last_login_at / last_active tracking
- explicit login event log
- AI usage log table
- admin audit log table
- daily metrics snapshot table
These are phase-2 additions.

### Frontend findings

#### 1) Routing and auth flow
- The root route tree is defined in [frontend/src/App.tsx](frontend/src/App.tsx).
- Route guards already exist:
  - `PrivateRoute` wraps authenticated pages
  - `RoleRoute` checks the user’s role and redirects to `/unauthorized` when access is denied
- Admin route protection is already partially wired in [frontend/src/routes/AdminRoutes.tsx](frontend/src/routes/AdminRoutes.tsx): it wraps a route under `RoleRoute role={ROLES.ADMIN}`.

#### 2) Existing admin page and layout pattern
- There is an admin dashboard stub in [frontend/src/pages/admin/Dashboard.tsx](frontend/src/pages/admin/Dashboard.tsx). It is not yet a real metrics dashboard; it is currently a Vite starter screen.
- Shared shell/layout is in [frontend/src/layouts/Applayout.tsx](frontend/src/layouts/Applayout.tsx), and dashboard/sidebar navigation is in [frontend/src/components/app-sidebar.tsx](frontend/src/components/app-sidebar.tsx).
- This project already uses shadcn/ui-style components and Tailwind-heavy classes, so the admin pages should follow that same shell rather than inventing a new layout system.

#### 3) Existing role-based dashboard patterns
- [frontend/src/components/RoleBasedDashboard.tsx](frontend/src/components/RoleBasedDashboard.tsx) dispatches by current user role.
- `admin` is recognized as a valid role in [frontend/src/constants/roles.ts](frontend/src/constants/roles.ts), and the app already sends `admin` through the frontend type system in [frontend/src/services/api.ts](frontend/src/services/api.ts).
- The backend and frontend currently have a role naming mismatch to be resolved carefully: backend user roles are `student`, `instructor`, `admin`; project roles are `leader`, `advisor`, `member`, `instructor`.

#### 4) Query and mutation patterns
- TanStack Query patterns are established in [frontend/src/hooks/useAuth.ts](frontend/src/hooks/useAuth.ts) and [frontend/src/hooks/useProject.ts](frontend/src/hooks/useProject.ts).
- The repo uses a query-key factory pattern (`projectKeys`, etc.) and invalidates relevant queries after mutations.
- There is no `adminKeys` factory yet. This should be introduced as part of the dashboard work.

#### 5) Shared UI patterns available
- The app has UI primitives under [frontend/src/components/ui](frontend/src/components/ui) and dashboard components such as tabs, cards, tables, and sidebars.
- The admin dashboard should reuse these existing primitives instead of introducing a custom component layer.

---

## Phase 2: Design

### A. Access control design

#### Role model recommendation
1. Keep `admin` as a global user role, because the app already expects it in frontend and some backend code references it.
2. Keep `advisor` as a project role, not a global user role; that aligns with how project membership and project relationships are modeled in [backend/app/modules/project_members/model.py](backend/app/modules/project_members/model.py).
3. Add a dedicated `require_admin` dependency in the backend and protect admin APIs behind it.

#### Safe enum migration approach
- Production migration should not rely on a naive `DROP TYPE`.
- Recommendation: add a Postgres migration that performs an `ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin'` in the existing enum if the database is already created without the value.
- If enum type is out of sync across environments, verify migration SQL before applying and keep the migration idempotent where possible.

#### Admin creation flow
- The first admin should be created via a one-time bootstrap script or a secure DB seed command, not via a public registration endpoint.
- Recommended: `python -m app.scripts.seed_admin` or a dedicated Alembic data migration for the first account, with a guarded environment variable or CLI flag.
- Do not expose a public create-admin endpoint; this should be operationally controlled.

### B. Instructor account creation flow

#### Recommended approach
- Use a secure invite/set-password flow rather than generating a temporary random password that is emailed in plaintext.
- Recommendation: create the instructor account in a pending or invited state, send an invite link, and force a password reset on first login.
- Rationale:
  - prevents password leakage in logs or backend responses
  - fits the repo’s existing framework style
  - aligns with least-privilege and auditability

#### Required fields
- `email` (unique, validated)
- `first_name`
- `last_name`
- `role` = `instructor`
- optional `is_active` default `true` or `false` depending on approval workflow

#### Duplicate emails and validation
- enforce uniqueness on `users.email`
- reject duplicate emails with a clean 409-style API response
- validate password rules with the same FastAPI Users rules already in use

#### Audit logging
- log actor, target, timestamp, action, reason, and outcome
- this is required for account creation and deactivation events

### C. Account management design

#### Recommended endpoints
- `GET /admin/users` — list users with pagination/search/filter
- `GET /admin/users/{user_id}` — fetch one user
- `PATCH /admin/users/{user_id}` — edit account metadata
- `POST /admin/users/{user_id}/deactivate`
- `POST /admin/users/{user_id}/reactivate`
- `POST /admin/users/{user_id}/reset-password`
- `DELETE /admin/users/{user_id}` or `POST /admin/users/{user_id}/soft-delete`

#### Request and response schemas
- Use typed Pydantic models with UUID, role, status, timestamps, and safe fields only.
- Never expose password hashes or raw JWT material.

#### Safeguards
- Admin cannot delete or demote themselves.
- Last admin cannot be removed or deactivated without a backup admin existing.
- Deactivated users are rejected at login and token refresh.
- Soft delete is recommended over hard delete because the system already uses relational data and user records are connected to project memberships, tasks, and invitations. Use `is_active = false`, `deleted_at`, and optionally `deleted_by` with a `soft-delete` pattern.
- If a user has active project relationships, either block deletion or require reassignment; do not silently wipe those records.

### D. System metrics design

#### Metrics that are computable from existing tables now
These should be built with SQL aggregation and grouped by date without Python row iteration.

1. User & account metrics
- total users; users by role
- new signups per day/week/month
- active vs inactive/deactivated accounts
- email verification rate
- accounts with no project membership
- no new table required for these; use `users`, `project_members`

2. Project metrics
- total projects and projects by status (if project status is introduced or if status is inferred from snapshots)
- average team size
- projects per instructor/advisor
- project completion rate / average duration
- stalled projects
- projects at risk from workload snapshots or overdue tasks

3. Task metrics
- tasks by status
- created vs completed over time
- overdue tasks and overdue rate
- average and median cycle time
- submitted tasks and rejection rate
- unassigned task count
- tasks by complexity and by skill category

4. Workload & collaboration metrics
- workload status distribution across members
- chronic overload flag from `member_snapshots`
- invitations sent, accepted, rejected, expired
- average time to accept an invitation
- recommendation generated vs accepted

5. File & storage metrics
- total uploads and total storage bytes
- average file size
- uploads per day
- top file types
- largest projects by storage used

6. AI usage metrics
- complexity-scoring requests per day
- success vs failure rate
- retry and retry exhaustion counts
- average latency per request/provider/model
- rate limit / quota errors
These are possible when AI logging is added; otherwise they’re not measurable at the app layer.

#### New tracking required (phase 2)
Recommended minimum additions:
- `users.last_login_at` (nullable datetime)
- `users.last_active_at` (nullable datetime)
- `users.deactivated_at` (nullable datetime)
- `users.deleted_at` (nullable datetime)
- `ai_usage_log` table with `user_id`, `provider`, `model`, `request_id`, `status`, `latency_ms`, `retry_count`, `error_type`, `created_at`
- `audit_log` table with `actor_id`, `target_user_id`, `action`, `metadata_json`, `created_at`
- optional `daily_metrics_snapshot` for pre-aggregated dashboards or retention views

#### Refresh and caching strategy
- Overview cards: short TTL cache (e.g., 60–180 seconds)
- Chart drill-downs: on-demand queries with a smaller window and client-side date-range filtering
- Daily snapshot table: useful if the admin dashboard needs historical trend charts at high volume; keep it optional and phase-2

#### API design for metrics
- A single GET `/admin/metrics/overview` response should return summary cards and the main KPI deltas.
- Separate endpoints should exist for chart and table data by category:
  - `/admin/metrics/users`
  - `/admin/metrics/projects`
  - `/admin/metrics/tasks`
  - `/admin/metrics/workload`
  - `/admin/metrics/ai`
  - `/admin/metrics/storage`
  - `/admin/metrics/health`
- Include date-range filters (`7d`, `30d`, `90d`, custom) and previous-period comparison.
- Build all queries with SQL aggregates, `GROUP BY`, `date_trunc`, and `percentile_cont` when needed.

### E. Frontend design

#### Page/route map
- `/admin`
- `/admin/users`
- `/admin/users/new`
- `/admin/users/:id`
- `/admin/metrics`
- `/admin/metrics/users`
- `/admin/metrics/projects`
- `/admin/metrics/workload`
- `/admin/metrics/ai`

#### Layout
- Reuse the existing app shell from [frontend/src/layouts/Applayout.tsx](frontend/src/layouts/Applayout.tsx).
- Add an admin section to [frontend/src/components/app-sidebar.tsx](frontend/src/components/app-sidebar.tsx) for Users and Metrics.
- Keep a consistent header, breadcrumb, and card styling with the rest of the app.

#### Page components
- Overview page: KPI cards with trend arrows, stacked charts, recent alerts
- Users page: searchable/filterable table, role chips, status badges, bulk actions
- User detail drawer or page: profile + role + account state + activity summary
- Create instructor page: form with email, name, role, password policy, validation, and invite submit
- Metrics pages: charts and tables, grouped by tab

#### Visualization mapping
- KPI card + trend arrow: growth, completion rate, counts
- line chart: signups, monthly throughput, AI request volume
- bar chart: tasks by status, invitations, project counts by advisor
- donut chart: task lifecycle, user roles, upload distribution
- table: top projects by storage, recent admin actions, slow endpoints

#### TanStack Query design
- Add `adminKeys` factory similar to `projectKeys`.
- Example pattern:
  - `adminKeys.all`
  - `adminKeys.overview`
  - `adminKeys.users.list(filters)`
  - `adminKeys.users.detail(id)`
  - `adminKeys.metrics.category(category, range)`
- On mutation success, invalidate the right keys and optionally set cached data for optimistic updates.

### F. Security and quality

#### Security recommendations
- Keep admin routes separate from normal user routes.
- Use a dedicated backend dependency and backend route prefix such as `/admin` or `/admin/users`.
- Do not expose secrets or raw password hashes in API responses.
- Ensure CORS and route protection remain consistent with the existing FastAPI app configuration.
- Enforce rate limiting or at least guard against repeated login attempts and admin actions; the current repository does not yet show a dedicated rate-limiter.

#### Testing plan
- Backend integration tests for admin guards, create-user flow, reactivate/deactivate, soft delete, and metrics endpoints.
- Frontend tests for route protection, admin sidebar visibility, and user-management page states.
- For metrics, test that aggregate SQL endpoints correctly filter by date range and prior period comparison.

---

## Phase 3: Implementation plan

### Step 1 — Database and enum migration
- Create the migration for the `user_role` enum and admin-safe handling.
- Add any required fields for account lifecycle tracking (`last_login_at`, `deactivated_at`, `deleted_at`, etc.) as phase-2 additions.
- Files to touch:
  - [backend/migrations](backend/migrations)
  - [backend/app/modules/users/model.py](backend/app/modules/users/model.py)
  - [backend/app/core/config.py](backend/app/core/config.py) if env vars or app defaults are needed

### Step 2 — Backend admin access control
- Add a `require_admin` dependency and an admin-scoped route prefix.
- Make sure the dependency checks both `is_active` and `role == UserRole.ADMIN`.
- Files to create/modify:
  - [backend/app/modules/users/routes.py](backend/app/modules/users/routes.py)
  - new `backend/app/modules/admin/` package or a dedicated `backend/app/modules/users/admin_routes.py`
  - [backend/app/api/api.py](backend/app/api/api.py)

### Step 3 — Admin user account API
- Create admin-safe endpoints for listing, filtering, fetching, updating, deactivating, reactivating, reset password, and soft delete.
- Reuse FastAPI Users for user creation and password reset where feasible.
- Files to create/modify:
  - [backend/app/modules/users/schema.py](backend/app/modules/users/schema.py)
  - new `backend/app/modules/admin/schema.py`
  - new `backend/app/modules/admin/services.py`
  - new `backend/app/modules/admin/routes.py`

### Step 4 — Metrics endpoints
- Implement `/admin/metrics/overview` plus the category endpoints.
- Use SQL aggregates and `date_trunc` with a range parameter on each endpoint.
- Separate overview metrics from drill-down metrics; keep them typed and consistent.
- Files to create/modify:
  - new `backend/app/modules/admin/metrics_service.py`
  - new `backend/app/modules/admin/metrics_routes.py`
  - new `backend/app/modules/admin/metrics_schema.py`

### Step 5 — Audit and AI logging
- Add a minimal audit log table and AI usage tracking model if phase 2 begins in the same cycle.
- Keep these as additive, non-breaking schema changes.
- Files to create/modify:
  - [backend/app/modules/ai/client.py](backend/app/modules/ai/client.py)
  - [backend/app/modules/ai/service.py](backend/app/modules/ai/service.py)
  - new migration and model for `ai_usage_log`
  - new migration and model for `audit_log`

### Step 6 — Backend tests
- Add integration tests for admin guard logic and user lifecycle endpoints.
- Add tests for metrics endpoints using test DB data.
- Files to add/modify:
  - [backend/test/integration](backend/test/integration)
  - [backend/test/conftest.py](backend/test/conftest.py)

### Step 7 — Frontend admin shell and route wiring
- Replace the starter stub admin dashboard with real admin navigation and a proper shell.
- Add route entries under [frontend/src/routes/AdminRoutes.tsx](frontend/src/routes/AdminRoutes.tsx).
- Files to create/modify:
  - [frontend/src/pages/admin/Dashboard.tsx](frontend/src/pages/admin/Dashboard.tsx)
  - [frontend/src/components/app-sidebar.tsx](frontend/src/components/app-sidebar.tsx)
  - [frontend/src/routes/AdminRoutes.tsx](frontend/src/routes/AdminRoutes.tsx)

### Step 8 — Frontend admin pages and hooks
- Add list/detail/create/edit pages for instructor account management and a metrics overview page.
- Add an `adminKeys` query-key factory and admin hooks for list/detail/metrics.
- Files to create/modify:
  - [frontend/src/hooks](frontend/src/hooks)
  - [frontend/src/pages/admin](frontend/src/pages/admin)
  - [frontend/src/services/api.ts](frontend/src/services/api.ts)
  - [frontend/src/components](frontend/src/components)

### Step 9 — Verification and QA
- Verify access control and edge cases with backend tests.
- Verify route protection and empty/loading/error states in the frontend.
- Check that admin route names and query keys follow the current repo conventions and do not leak user-level data into aggregate dashboards.

---

## Recommendation summary

- Do not implement admin creation as a public endpoint.
- Prefer soft delete over hard delete for users with project relationships.
- Prefer invite + set-password flow for new instructors instead of sending a temporary password in plain text.
- Keep `admin` as a global user role, while `advisor` remains a project membership role.
- Build metrics using SQL aggregation from existing tables first; only add tracking tables for login activity, AI usage, and audit trails after the base dashboards are working.

This plan stops at the design and implementation plan stage as requested. It does not include app code changes yet; approval is required before any implementation work begins.
