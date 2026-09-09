# PSU-Collab — Claude Code Instructions

Capstone project-management system for Pampanga State University – Lubao Campus.
Stack: React/TypeScript frontend (Vite, Tailwind, shadcn/Radix, TanStack Query, Axios) + FastAPI/Python backend (SQLAlchemy async, Pydantic, Alembic, PostgreSQL, FastAPI Users).

Domains: projects, project members/roles, tasks, supertasks, assignments, comments, submissions, task contents, task relations/tags, peer evaluations, member/project snapshots, workload redistribution, notifications, invitations, meetings, messaging, AI task analysis.

## Core Principle
**Do not guess when the repo can tell you the answer.** Inspect → follow existing patterns → smallest correct change → verify → report what changed and what was actually tested.

## Golden Rules
1. **Inspect before editing.** Search for existing models/schemas/services/routes/hooks/components/types and follow the pattern. Never assume an endpoint, field, model, component, hook, util, env var, or dependency exists — search first, create only if truly needed.
2. **Preserve architecture.** Extend existing patterns; no unrelated refactors; don't replace working code just because another approach is more familiar.
3. **No over-engineering.** Smallest required change > new abstractions/large refactors/unrelated cleanup.
4. Check `frontend/package.json` and backend deps before assuming any library/package is available.

## Repo Structure
```
backend/app/{core,api,modules}/, backend/migrations/, backend/test/
frontend/src/{components,hooks,pages}, frontend/src/main.tsx
```
Backend modules: users, projects, project_members, tasks, supertasks, task_contents, assigned_members, peer_evaluations, task_comments, task_relations, task_submissions, task_tags, member_snapshots, member_activities, project_snapshots, notifications, invitations, meetings, messages, redistribution_recommendations, ai.

Key files to check first when relevant: `backend/app/core/config.py`, `core/db.py`, `main.py`, `api/api.py`, each module's `model.py`/`schema.py`/`routes.py`/`services.py`, `backend/test/unit/test_ai_task_complexity_score.py`, `frontend/src/{main.tsx,App.tsx,hooks/,components/ui/,pages/}`.

## Backend
- Business logic stays in the service layer where one exists — don't bloat route handlers.
- DB sessions via existing DI dependency only; use proper async SQLAlchemy + `await`; don't mix sync/async carelessly.
- IDs are **UUIDs**, not ints (Backend UUID → JSON string → TS string).
- Before touching a model: check relationships, FKs, nullable fields, defaults, migration history, and all consumers. A default does NOT imply non-nullable — respect actual nullability (esp. `description`, `started_at`, `completed_at`, `status`, `complexity`, `priority`, `category`, `deadline`, `total_time_spent`).
- Schema changes go through Alembic (`backend/migrations/`). Inspect generated SQL before applying. Never drop/reset DB, delete migration history, or hand-edit tables as a shortcut.

## Enums
Preserve exact existing values/casing (lowercase snake_case, e.g. `not_started`, `in_progress`, `low`/`medium`/`high`, `document`/`research`/`development`/`finance`, `zoom`/`google_meet`). Never invent `NOT_STARTED`/`NotStarted`-style variants. Known enums: UserRole, ProjectRole, Skills, TaskStatus, TaskPriority, TaskComplexity, TaskCategory, MeetingProvider, MeetingStatus, AssignedMember.Role, PeerEvaluationResult.

## Auth
FastAPI Users + JWT (`current_user`, `current_active_user`). Global roles: admin/student/instructor. Project roles: leader/advisor/member/instructor. Task roles: leader/member. Before touching a protected endpoint: check existing auth dependency + authorization logic (global vs project-scoped) and preserve it. When unsure, keep restrictions as-is rather than loosening them.

## Frontend
Search for existing page/component/hook/type before building new ones. Reuse UI primitives from `frontend/src/components/ui/`. Use existing TanStack Query setup — don't create new QueryClients, don't guess query keys, follow existing invalidation patterns after mutations. Don't assume React Hook Form/Zod/etc. are available without confirming in deps.

## Type Consistency (contract between layers)
When an API response changes: check Pydantic schema → route → frontend API/service → TS type → all consumers → update consistently. Don't paper over mismatches with `any`/type assertions. Watch for: UUID vs number, nullable fields, enum casing, optional fields, nested vs flat responses. Don't assume responses are wrapped (`{data: ...}`) or unwrapped — check the actual route/schema.

## Tasks (core entity)
Fields: id, name, description, created_by, project_id, started_at, completed_at, status, complexity, priority, category, deadline, complexity_points, total_time_spent, primary_skill, secondary_skills, created_at, updated_at.
Statuses: not_started/in_progress/submitted/completed. Complexity & priority: low/medium/high. Categories: document/research/development/finance.

## AI Features
Providers: OpenRouter, Gemini, HF Transformers, scikit-learn — don't assume all are used everywhere; check the actual module. AI output is untrusted: validate structure, handle malformed JSON/provider failures (auth, rate limit, timeout, connection, server errors) explicitly — never swallow silently, never leak keys in logs/responses. For complexity scoring (Low=1/Medium=2/High=3): inspect `backend/test/unit/test_ai_task_complexity_score.py` and preserve expected output structure; don't swap the algorithm without being asked.

## Workload Redistribution
Business-critical (`backend/app/modules/redistribution_recommendations/`). Preserve existing formulas, feasibility constraints, skill requirements, dependency/deadline/workload considerations unless explicitly asked to change them. Don't infer formulas from filenames/comments — read the actual code and tests.

## Config & Secrets
Never hardcode or log keys/passwords/tokens/credentials. New env vars follow the existing config pattern; document if applicable; never commit real secret values.

## Error Handling
No bare `except Exception: pass`. Catch specific exceptions. Backend: proper HTTP errors + useful log diagnostics. Frontend: user-facing error state + recovery action, never silently ignore failed requests.

## Dates
Distinguish Date vs DateTime vs tz-aware DateTime across DB/schema/frontend; don't mix naive/aware comparisons.

## Git Safety
`git status` first. Never reset user work, discard unrelated changes, force-push, delete branches, or rewrite history. Touch only files relevant to the task unless correctness requires more.

## Verification (before declaring done)
- Only claim something was tested if it actually ran.
- Check: changed files, imports, types, API contracts, error handling, related components/tests, DB implications (migration generated/reviewed/applied if models changed).
- Use the repo's actual configured commands (check `package.json` / backend config) for lint/format/typecheck/tests — don't invent tooling.
- If something couldn't be tested, say so explicitly.

## Ambiguous Requests
Try to resolve via the repo (existing routes/services/schemas/models/hooks) before asking the user. Only ask when it can't be resolved from code and materially affects implementation.

## Evidence Priority
Source code > tests > DB models/migrations > API schemas > frontend usage > docs > user requirements > general best practices. If docs conflict with implementation, flag it — don't silently pick one.

## Final Checklist
- [ ] Inspected existing code / reused patterns
- [ ] No invented APIs/fields/models/components
- [ ] UUIDs, nullable fields, enum casing preserved
- [ ] Frontend/backend types consistent
- [ ] Auth implications checked
- [ ] DB implications checked; migration created/reviewed if needed
- [ ] TanStack Query invalidations checked
- [ ] Errors handled, no secrets exposed
- [ ] Changes reviewed and verification actually run
- [ ] No unrelated code modified