# PSU-Collab — Claude Code Instructions

## 1. Project Context

PSU-Collab is a capstone collaboration and project-management system for Pampanga State University – Lubao Campus.

The system includes functionality for:

* Project management
* Project members and roles
* Task management
* Supertasks
* Task assignment
* Task comments
* Task submissions
* Task contents
* Task relations/dependencies
* Task tags
* Peer evaluations
* Member activities and snapshots
* Project snapshots
* Workload balancing and redistribution recommendations
* Notifications
* Invitations
* Meetings
* Messaging/chat
* AI-assisted task analysis

The repository contains a React/TypeScript frontend and a FastAPI/Python backend backed by PostgreSQL.

---

# 2. Highest-Priority Development Rules

## Inspect Before Editing

Before modifying code:

1. Inspect the existing implementation.
2. Search for related models, schemas, services, routes, hooks, components, and types.
3. Identify the existing pattern.
4. Make the smallest reasonable change.
5. Review the resulting changes.
6. Run appropriate verification.

Do not immediately create a new implementation based only on the user's description.

## Do Not Invent Existing Code

Never assume that any of the following exists:

* API endpoint
* database field
* model
* schema
* service
* repository
* React component
* React hook
* utility
* environment variable
* dependency
* configuration option

Search the repository first.

If something does not exist, create it only when the requested feature actually requires it.

## Preserve Existing Architecture

Prefer extending existing patterns over introducing new architectural patterns.

Do not perform unrelated refactors while implementing a feature.

Do not replace an existing working implementation merely because another approach is more familiar.

---

# 3. Technology Stack

## Frontend

Verified technologies include:

* React
* TypeScript
* Vite
* Tailwind CSS
* shadcn/Radix-based UI components
* TanStack Query
* Axios
* Lucide icons
* React Day Picker

Inspect `frontend/package.json` before assuming any additional dependency is available.

## Backend

Verified technologies include:

* Python
* FastAPI
* SQLAlchemy
* Pydantic
* Alembic
* PostgreSQL
* FastAPI Users
* Async database access

Inspect the backend dependency configuration before introducing or assuming a package.

## AI / Data

The project contains AI-related functionality involving:

* OpenRouter
* Gemini
* Hugging Face Transformers
* scikit-learn

Do not assume every AI provider is used by every feature. Inspect the relevant AI module before modifying provider behavior.

---

# 4. Repository Structure

Important areas include:

```text
backend/
├── app/
│   ├── core/
│   ├── api/
│   └── modules/
├── migrations/
└── test/

frontend/
└── src/
```

Important backend modules include:

```text
users
projects
project_members
tasks
supertasks
task_contents
assigned_members
peer_evaluations
task_comments
task_relations
task_submissions
task_tags
member_snapshots
member_activities
project_snapshots
notifications
invitations
meetings
messages
redistribution_recommendations
ai
```

The exact repository structure is authoritative. Search the repository before creating new directories or files.

---

# 5. Backend Architecture

The backend uses FastAPI with modularized application code.

Before modifying a backend feature, inspect the relevant:

```text
model.py
schema.py
routes.py
services.py
```

and any repository/database abstraction used by that module.

## Business Logic

Keep substantial business logic in the established service layer when the module uses one.

Route handlers should not become large containers for business rules when an existing service layer is available.

Follow the existing module's architecture rather than blindly applying a generic architecture.

## Database Sessions

The application uses asynchronous database access.

Database sessions should be obtained through the project's existing FastAPI dependency-injection mechanism.

Do not manually create independent database sessions inside route handlers when the existing dependency can be used.

Use the correct async SQLAlchemy APIs and `await` asynchronous operations where required.

---

# 6. Database Rules

## IDs

The extracted repository analysis indicates that entity identifiers are UUIDs.

Do not assume IDs are integers.

When working across the API and frontend:

```text
Backend UUID → JSON string → TypeScript string
```

Inspect the actual model/schema before changing an ID type.

## Models

Before modifying a SQLAlchemy model:

1. Inspect its relationships.
2. Inspect its foreign keys.
3. Inspect nullable fields.
4. Inspect defaults.
5. Inspect existing migrations.
6. Search for code consuming the model.

Do not silently change existing database semantics.

## Nullable Fields

A database field having a default does NOT automatically mean that it is non-nullable.

Respect the actual SQLAlchemy model and database schema.

This is particularly important for task fields such as:

* description
* started_at
* completed_at
* status
* complexity
* priority
* category
* deadline
* total_time_spent

Do not remove `null`/`undefined` handling from frontend types merely because a database column has a default.

## Relationships

Understand existing relationships before changing them.

The project uses relationships involving:

* users
* projects
* project members
* tasks
* comments
* submissions
* contents
* tags
* assigned members
* peer evaluations
* snapshots
* activities
* meetings
* messages

Do not create duplicate relationships.

Be aware of SQLAlchemy relationship loading behavior. Use appropriate eager-loading strategies when required by the existing implementation.

---

# 7. Alembic Migrations

Database schema changes must be handled through the existing Alembic migration system.

Migrations are located under:

```text
backend/migrations/
```

Before changing a model, inspect its migration history.

Typical migration commands include:

```bash
alembic revision --autogenerate -m "description"
alembic upgrade head
alembic downgrade -1
alembic current
```

Use the project's actual migration configuration and working directory.

## Never

Do not:

* Drop the database unless explicitly requested.
* Reset the database as a shortcut.
* Delete migration history.
* Modify database tables manually as a replacement for migrations.
* Generate a migration without reviewing the generated SQL/schema changes.

After generating an Alembic migration, inspect it before applying it.

---

# 8. Enums

The project uses enums for several domain concepts.

Known enums include:

```text
UserRole
ProjectRole
Skills
TaskStatus
TaskPriority
TaskComplexity
TaskCategory
MeetingProvider
MeetingStatus
AssignedMember.Role
PeerEvaluationResult
```

Known string values include lowercase values such as:

```text
admin
student
instructor

leader
advisor
member

not_started
in_progress
submitted
completed

low
medium
high

document
research
development
finance

zoom
google_meet
```

Preserve the exact existing enum values and casing.

Do not introduce a different representation such as:

```text
NOT_STARTED
NotStarted
notStarted
```

when the API/database expects:

```text
not_started
```

Always inspect the actual enum definition before adding a new enum value.

---

# 9. Authentication and Authorization

The backend uses FastAPI Users with JWT-based authentication.

Existing authentication dependencies include:

```python
current_user
current_active_user
```

Do not bypass the established authentication mechanism.

The global user roles include:

```text
admin
student
instructor
```

Project-specific roles include:

```text
leader
advisor
member
instructor
```

Task assignment roles include:

```text
leader
member
```

Before modifying a protected endpoint:

1. Inspect its existing authentication dependency.
2. Inspect existing authorization logic.
3. Determine whether permissions are global or project-specific.
4. Preserve the established permission behavior.

Do not invent a permission hierarchy unless it is explicitly defined by the existing implementation or requested by the user.

When uncertain about authorization, prefer preserving existing restrictions rather than weakening them.

---

# 10. Frontend Architecture

The frontend is React + TypeScript.

Important areas include:

```text
frontend/src/
├── components/
├── hooks/
├── pages/
└── main.tsx
```

The application uses TanStack Query for server-state management.

Before implementing a new frontend feature:

1. Search for a similar page/component.
2. Search for the relevant API service/hook.
3. Search for existing types.
4. Reuse existing UI primitives.
5. Follow the existing data-fetching pattern.

Do not create duplicate API clients, query clients, hooks, or components unnecessarily.

---

# 11. TanStack Query

Use the project's existing TanStack Query configuration and patterns.

Do not create a new `QueryClient` inside individual components.

For server data:

* Use the established query hooks.
* Use the established mutation hooks.
* Follow existing query keys.
* Invalidate/update affected queries after mutations when the existing pattern requires it.

Do not assume a particular query key.

Search for the existing hook/query before creating one.

When a mutation changes data displayed elsewhere, inspect existing invalidation behavior and preserve consistency.

---

# 12. Frontend / Backend Type Consistency

Treat API types as a contract.

When a backend response changes:

1. Inspect the Pydantic response schema.
2. Inspect the route.
3. Inspect the frontend API/service.
4. Inspect the TypeScript type.
5. Search all consumers.
6. Update affected layers consistently.

Do not fix a type mismatch by blindly using:

```typescript
any
```

or excessive type assertions.

Prefer fixing the actual mismatch.

Especially watch for:

* UUID strings vs numbers
* nullable fields
* enum casing
* optional response fields
* nested vs direct response objects

---

# 13. API Architecture

Main API resources include:

```text
/users/
/projects/
/project_members/
/tasks/
/supertasks/
/task_contents/
/assigned_members/
/peer_evaluations/
/task_comments/
/task_relations/
/task_submissions/
/task_tags/
/member_snapshots/
/member_activities/
/project_snapshots/
/notifications/
/invitations/
/meetings/
```

There is also functionality for messaging/chat and workload redistribution.

Before adding an endpoint:

1. Search `backend/app/api/api.py`.
2. Search the relevant module's routes.
3. Check whether an endpoint already exists.
4. Follow the existing naming and HTTP method conventions.
5. Reuse existing schemas/services.

Do not create duplicate endpoints for functionality that already exists.

---

# 14. API Response Contracts

Do not assume that API responses are wrapped in:

```json
{
  "data": ...
}
```

Inspect the actual route and Pydantic response schema.

Likewise, do not assume that a response is unwrapped.

The existing implementation is authoritative.

If changing a response shape, search the frontend for every consumer before making the change.

---

# 15. Tasks

Tasks are a core domain entity.

Known task fields include:

```text
id
name
description
created_by
project_id
started_at
completed_at
status
complexity
priority
category
deadline
complexity_points
total_time_spent
primary_skill
secondary_skills
created_at
updated_at
```

Known task statuses:

```text
not_started
in_progress
submitted
completed
```

Known complexity levels:

```text
low
medium
high
```

Known priorities:

```text
low
medium
high
```

Known categories:

```text
document
research
development
finance
```

Do not change task semantics without checking all dependent functionality.

---

# 16. Task Complexity

The project has AI-assisted task complexity functionality.

Known complexity levels:

```text
Low = 1
Medium = 2
High = 3
```

The repository contains tests for AI task complexity scoring:

```text
backend/test/unit/test_ai_task_complexity_score.py
```

When modifying AI complexity functionality:

* Inspect the actual implementation.
* Inspect the existing tests.
* Preserve the expected structured output.
* Validate AI-generated data before using it.
* Handle malformed responses.
* Handle provider failures.
* Do not assume the model will always return valid JSON.

Do not replace the existing scoring logic with a different algorithm unless explicitly requested.

---

# 17. Workload Redistribution

The workload redistribution system is a significant domain feature.

Relevant code is located under:

```text
backend/app/modules/redistribution_recommendations/
```

Before modifying it, inspect the actual implementation and tests.

Do not infer formulas from filenames or comments alone.

The workload system should be treated as business-critical logic.

When modifying workload calculations:

* Preserve existing formulas unless explicitly asked to change them.
* Preserve feasibility constraints.
* Preserve skill requirements.
* Consider task dependencies.
* Consider deadlines.
* Consider current member workload.
* Verify before/after workload behavior.
* Test edge cases.

Do not replace a constraint-aware recommendation system with an arbitrary score.

---

# 18. AI Integration

AI-related functionality includes provider integrations such as:

* OpenRouter
* Gemini
* Hugging Face/Transformers
* scikit-learn-based processing where applicable

Before changing an AI provider:

1. Inspect the existing AI client.
2. Inspect configuration.
3. Inspect model selection.
4. Inspect retry behavior.
5. Inspect response parsing.
6. Inspect tests.

AI responses are untrusted external input.

Always validate structured responses before using them in application logic.

## AI Errors

Handle provider failures appropriately, including:

* authentication failures
* rate limits
* timeouts
* connection failures
* malformed responses
* server errors

Do not silently swallow AI failures.

Do not expose API keys or credentials in logs or responses.

---

# 19. Configuration and Secrets

Configuration is centralized under the backend core configuration system.

Never hardcode:

* API keys
* passwords
* access tokens
* database credentials
* private credentials

Never commit secrets.

Never print secrets in logs.

If a new environment variable is required:

1. Inspect the existing configuration pattern.
2. Add the setting consistently.
3. Update the appropriate example/documentation if one exists.
4. Never insert the actual secret into source code.

---

# 20. Error Handling

Follow the existing error-handling patterns.

Do not use:

```python
try:
    ...
except Exception:
    pass
```

Do not hide errors merely to make a feature appear functional.

Catch specific exceptions when possible.

For backend API errors:

* Use the project's established FastAPI error handling.
* Return appropriate HTTP errors.
* Preserve useful diagnostics in logs.

For frontend errors:

* Show an appropriate user-facing state.
* Provide recovery actions when appropriate.
* Do not silently ignore failed requests.

---

# 21. Async Code

The backend uses asynchronous database access.

Be careful with:

* `AsyncSession`
* `await`
* asynchronous SQLAlchemy queries
* async provider calls
* FastAPI async route handlers

Do not mix synchronous and asynchronous patterns casually.

Before changing database access, inspect how neighboring code handles the session.

---

# 22. Date and Time

The project contains both date-only and datetime fields.

Do not assume all temporal values are the same type.

Pay attention to:

```text
Date
DateTime
timezone-aware DateTime
```

Before comparing or transforming dates:

* Check the actual database type.
* Check the Pydantic schema.
* Check the frontend representation.
* Preserve timezone information where required.

Do not introduce naive/aware datetime comparisons.

---

# 23. UI Conventions

Reuse existing shadcn/Radix-based components.

Known UI primitives include:

* Button
* Dialog
* Select
* Dropdown
* Card
* Tabs
* Date picker
* Tooltips
* Icons

Before creating a custom component, inspect:

```text
frontend/src/components/ui/
```

and existing feature components.

Do not introduce a new UI library for a component that can be implemented with the existing stack.

---

# 24. Forms

When modifying forms:

* Inspect existing form implementations first.
* Preserve existing validation patterns.
* Keep labels associated with inputs.
* Display validation errors clearly.
* Disable submission appropriately during requests.
* Preserve existing loading/error/success behavior.

Do not assume React Hook Form, Zod, or another form library is available unless confirmed in the actual project dependencies/code.

---

# 25. Responsive UI

Follow the existing Tailwind responsive patterns.

When changing a component:

* Check desktop behavior.
* Check narrow layouts.
* Avoid unnecessary horizontal overflow.
* Preserve existing responsive behavior.

Do not redesign unrelated pages.

---

# 26. Git Safety

Before making changes:

```bash
git status
```

Assume the working tree may contain user changes.

Never:

* reset the user's work
* discard unrelated changes
* force-push
* delete branches
* rewrite history
* use destructive Git commands without explicit instruction

Only modify files relevant to the requested task unless another change is required for correctness.

---

# 27. Verification

Never claim that something was tested unless it was actually tested.

Before finishing a task, review:

* changed files
* imports
* types
* API contracts
* error handling
* related components
* related tests
* database implications

Run the project's actual configured checks.

## Backend

Inspect the repository for the configured commands for:

* pytest
* linting
* formatting
* type checking

Do not invent tools that are not configured.

## Frontend

Inspect `frontend/package.json` for the actual scripts before running:

* lint
* build
* type checks
* tests

## Database

If models changed:

* inspect migration changes
* generate migration when appropriate
* review migration
* verify upgrade behavior

If something could not be tested, explicitly report that.

---

# 28. Do Not Over-Engineer

Prefer:

```text
existing pattern
→ smallest required change
→ verification
```

over:

```text
new architecture
→ large refactor
→ unrelated cleanup
→ increased risk
```

Do not introduce abstractions simply because they are theoretically cleaner.

Do not refactor unrelated code during feature work.

---

# 29. Handling Ambiguous Requests

If the repository can answer the question, inspect it before asking the user.

For example:

If asked to "add a task API," search for:

* existing task routes
* task services
* task schemas
* task models
* frontend task hooks

If asked to "fix the project member type," search for:

* backend response schema
* frontend type
* API service
* React Query hook
* consuming components

Only ask the user when the ambiguity materially affects the implementation and cannot be resolved from the codebase.

---

# 30. Important Files

When beginning work on a related feature, inspect the relevant files first.

Important known locations include:

```text
backend/app/core/config.py
backend/app/core/db.py
backend/app/main.py
backend/app/api/api.py

backend/app/modules/users/model.py
backend/app/modules/projects/model.py
backend/app/modules/project_members/model.py
backend/app/modules/tasks/model.py
backend/app/modules/tasks/services.py
backend/app/modules/meetings/model.py
backend/app/modules/messages/model.py
backend/app/modules/redistribution_recommendations/services.py
backend/app/modules/ai/

backend/migrations/

backend/test/
backend/test/unit/test_ai_task_complexity_score.py

frontend/src/main.tsx
frontend/src/App.tsx
frontend/src/hooks/
frontend/src/components/ui/
frontend/src/pages/
frontend/package.json
```

These are starting points, not an exhaustive list.

Always verify the current repository before relying on them.

---

# 31. Evidence Over Assumption

When making implementation decisions, use this order:

1. Existing source code
2. Existing tests
3. Existing database models/migrations
4. Existing API schemas
5. Existing frontend usage
6. Project documentation
7. Explicit user requirements
8. General best practices

Do not replace repository evidence with generic assumptions.

If documentation conflicts with the implementation, inspect the conflict and avoid silently assuming which one is correct.

---

# 32. Final Checklist

Before declaring the task complete:

* [ ] I inspected the relevant existing code.
* [ ] I reused existing patterns where appropriate.
* [ ] I did not invent existing APIs, fields, models, or components.
* [ ] I preserved UUID handling.
* [ ] I preserved nullable/optional fields.
* [ ] I preserved enum values and casing.
* [ ] I checked frontend/backend type compatibility.
* [ ] I checked authentication/authorization implications.
* [ ] I checked database implications.
* [ ] I created/reviewed an Alembic migration if required.
* [ ] I checked affected TanStack Query queries/mutations.
* [ ] I handled errors appropriately.
* [ ] I did not expose secrets.
* [ ] I reviewed my changes.
* [ ] I ran the relevant verification commands.
* [ ] I did not claim tests passed unless they actually ran.
* [ ] I did not modify unrelated code.

---

# Core Principle

**Do not guess when the repository can tell you the answer.**

Inspect first.

Follow existing patterns.

Make the smallest correct change.

Verify it.

Then report exactly what was changed and what was actually verified.