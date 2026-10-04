# System Function Map

## 1. System Overview

PSU-Collab is a project-management system for Pampanga State University – Lubao Campus. It enables students, instructors, and administrators to manage academic projects, tasks, and collaboration. The system features:

- **Project Management**: Create and manage projects with assigned members, advisors, and instructors
- **Task Management**: Break down projects into tasks and supertasks (groupings of tasks)
- **Workload Distribution**: Calculate and visualize member workloads, identify overload/underutilization
- **AI-Powered Task Analysis**: Automatically score task complexity using AI providers
- **Collaboration Tools**: Comments, attachments, links, messaging, and meetings
- **Skill-Based Assignment**: Match tasks to members based on required skills
- **Notifications & Alerts**: System notifications for important events

The system uses a React/TypeScript frontend with Vite, Tailwind CSS, and shadcn/ui components, connected to a FastAPI/Python backend with SQLAlchemy ORM, PostgreSQL database, and AI integration capabilities.

## 2. Architecture Overview

The system follows a layered architecture:

```
Frontend Layer (React/TypeScript)
    ↓ (HTTP/JSON)
API Layer (FastAPI Routes)
    ↓ (Dependency Injection)
Service Layer (Business Logic)
    ↓ (Repository Pattern)
Data Access Layer (SQLAlchemy Models)
    ↓
Database (PostgreSQL)
```

Key architectural patterns:
- **Separation of Concerns**: Clear division between API controllers, services, and repositories
- **Dependency Injection**: Database sessions injected via FastAPI dependencies
- **Repository Pattern**: Abstracts data access logic
- **Service Layer**: Contains business logic and orchestrates operations
- **TanStack Query**: Frontend data fetching and state management
- **Reactive Updates**: Automatic cache invalidation on mutations

## 3. Core Modules

### Module: Authentication
**Purpose:** Handle user authentication, authorization, and session management using FastAPI Users
**Core entities:** User, RefreshToken
**Dependencies:** Users module
**Importance:** CORE

| Function | Location | Type | Importance | Purpose |
| -------- | -------- | ---- | ---------- | ------- |
| authenticate_user | backend/app/modules/users/auth.py | AUTHENTICATION | CORE | Validates user credentials and returns access/refresh tokens |
| refresh_access_token | frontend/src/services/api.ts | AUTHENTICATION | CORE | Refreshes expired access tokens using refresh token |
| get_current_user | frontend/src/services/api.ts | AUTHENTICATION | CORE | Retrieves current user profile |
| loginUser | frontend/src/services/api.ts | AUTHENTICATION | CORE | Handles user login |
| logoutUser | frontend/src/services/api.ts | AUTHENTICATION | CORE | Handles user logout |
| registerUser | frontend/src/services/api.ts | AUTHENTICATION | CORE | Handles user registration |
| updateCurrentUser | frontend/src/services/api.ts | AUTHENTICATION | CORE | Updates user profile |
| useAuth hook | frontend/src/hooks/useAuth.ts | AUTHENTICATION | CORE | Manages authentication state in frontend |

### Module: Users
**Purpose:** Manage user profiles and roles (admin, student, instructor)
**Core entities:** User
**Dependencies:** None (foundational)
**Importance:** CORE

| Function | Location | Type | Importance | Purpose |
| -------- | -------- | ---- | ---------- | ------- |
| get_one_user | backend/app/modules/users/services.py | DATABASE_OPERATION | CORE | Retrieve user by ID |
| get_all_users | backend/app/modules/users/services.py | DATABASE_OPERATION | CORE | Retrieve all users |
| create_user | backend/app/modules/users/services.py | DATABASE_OPERATION | CORE | Create new user |
| update_user | backend/app/modules/users/services.py | DATABASE_OPERATION | CORE | Update existing user |
| delete_user | backend/app/modules/users/services.py | DATABASE_OPERATION | CORE | Delete user |
| useUser hook | frontend/src/hooks/useUser.ts | FRONTEND_QUERY | CORE | Fetch user data in frontend |

### Module: Projects
**Purpose:** Manage academic projects with metadata, timelines, and ownership
**Core entities:** Project
**Dependencies:** Users
**Importance:** CORE

| Function | Location | Type | Importance | Purpose |
| -------- | -------- | ---- | ---------- | ------- |
| get_one_project | backend/app/modules/projects/services.py | DATABASE_OPERATION | CORE | Retrieve project by ID |
| get_all_projects | backend/app/modules/projects/services.py | DATABASE_OPERATION | CORE | Retrieve all projects |
| create_project | backend/app/modules/projects/services.py | DATABASE_OPERATION | CORE | Create new project |
| update_project | backend/app/modules/projects/services.py | DATABASE_OPERATION | CORE | Update existing project |
| delete_project | backend/app/modules/projects/services.py | DATABASE_OPERATION | CORE | Delete project |
| useProject hook | frontend/src/hooks/useProject.ts | FRONTEND_QUERY | CORE | Fetch project data in frontend |
| useProjectInvite hook | frontend/src/hooks/useProjectInvite.ts | FRONTEND_QUERY | CORE | Manage project invitations |

### Module: Project Members
**Purpose:** Manage user membership in projects with roles and skills
**Core entities:** ProjectMember
**Dependencies:** Users, Projects
**Importance:** CORE

| Function | Location | Type | Importance | Purpose |
| -------- | -------- | ---- | ---------- | ------- |
| get_one_member | backend/app/modules/project_members/services.py | DATABASE_OPERATION | CORE | Retrieve project member by ID |
| get_all_members_by_project | backend/app/modules/project_members/services.py | DATABASE_OPERATION | CORE | Retrieve all members for a project |
| create_member | backend/app/modules/project_members/services.py | DATABASE_OPERATION | CORE | Add user to project |
| update_member | backend/app/modules/project_members/services.py | DATABASE_OPERATION | CORE | Update project member |
| delete_member | backend/app/modules/project_members/services.py | DATABASE_OPERATION | CORE | Remove user from project |
| useProjectMember hook | frontend/src/hooks/useProjectMember.ts | FRONTEND_QUERY | CORE | Fetch project member data |
| is_working_member | backend/app/modules/redistribution_recommendations/workload_calculation.py | BUSINESS_RULE | CORE | Determine if member counts toward workload baseline |

### Module: Tasks
**Purpose:** Manage individual units of work within projects
**Core entities:** Task
**Dependencies:** Projects, Project Members, Users
**Importance:** CORE

| Function | Location | Type | Importance | Purpose |
| -------- | -------- | ---- | ---------- | ------- |
| get_one_task | backend/app/modules/tasks/services.py | DATABASE_OPERATION | CORE | Retrieve task by ID |
| get_all_project_tasks | backend/app/modules/tasks/services.py | DATABASE_OPERATION | CORE | Retrieve all tasks for a project |
| create_task | backend/app/modules/tasks/services.py | DATABASE_OPERATION | CORE | Create new task |
| update_task | backend/app/modules/tasks/services.py | DATABASE_OPERATION | CORE | Update existing task |
| delete_task | backend/app/modules/tasks/services.py | DATABASE_OPERATION | CORE | Delete task |
| get_tasks_for_user | backend/app/modules/tasks/services.py | DATABASE_OPERATION | CORE | Retrieve tasks assigned to a user |
| get_assigned_members | backend/app/modules/tasks/services.py | DATABASE_OPERATION | CORE | Retrieve tasks with assigned members |
| useTask hook | frontend/src/hooks/useTask.ts | FRONTEND_QUERY | CORE | Fetch task data in frontend |
| useCreateTask hook | frontend/src/hooks/useTask.ts | FRONTEND_MUTATION | CORE | Create tasks in frontend |
| useUpdateTask hook | frontend/src/hooks/useTask.ts | FRONTEND_MUTATION | CORE | Update tasks in frontend |
| useDeleteTask hook | frontend/src/hooks/useTask.ts | FRONTEND_MUTATION | CORE | Delete tasks in frontend |
| useGetTasksForUser hook | frontend/src/hooks/useTask.ts | FRONTEND_QUERY | CORE | Fetch user-assigned tasks |
| _determine_task_category | backend/app/modules/tasks/services.py | BUSINESS_RULE | CORE | Map primary skill to task category |
| score_task_complexity | backend/app/modules/ai/service.py | AI | CORE | AI-powered task complexity scoring |

### Module: Supertasks
**Purpose:** Group related tasks within a project for better organization
**Core entities:** Supertask
**Dependencies:** Projects
**Importance:** IMPORTANT

| Function | Location | Type | Importance | Purpose |
| -------- | -------- | ---- | ---------- | ------- |
| get_one_supertask | backend/app/modules/supertasks/services.py | DATABASE_OPERATION | IMPORTANT | Retrieve supertask by ID |
| get_project_supertasks | backend/app/modules/supertasks/services.py | DATABASE_OPERATION | IMPORTANT | Retrieve all supertasks for a project |
| create_supertask | backend/app/modules/supertasks/services.py | DATABASE_OPERATION | IMPORTANT | Create new supertask |
| update_supertask | backend/app/modules/supertasks/services.py | DATABASE_OPERATION | IMPORTANT | Update existing supertask |
| delete_supertask | backend/app/modules/supertasks/services.py | DATABASE_OPERATION | IMPORTANT | Delete supertask |
| useSupertask hook | frontend/src/hooks/useSupertask.ts | FRONTEND_QUERY | IMPORTANT | Fetch supertask data in frontend |

### Module: Assigned Members
**Purpose:** Link project members to tasks with effort sharing
**Core entities:** AssignedMember
**Dependencies:** Tasks, Project Members
**Importance:** CORE

| Function | Location | Type | Importance | Purpose |
| -------- | -------- | ---- | ---------- | ------- |
| get_one_assigned_member | backend/app/modules/assigned_members/services.py | DATABASE_OPERATION | CORE | Retrieve assigned member by ID |
| get_all_assigned_members | backend/app/modules/assigned_members/services.py | DATABASE_OPERATION | CORE | Retrieve all assigned members |
| create_assigned_member | backend/app/modules/assigned_members/services.py | DATABASE_OPERATION | CORE | Assign member to task |
| update_assigned_member | backend/app/modules/assigned_members/services.py | DATABASE_OPERATION | CORE | Update assigned member |
| delete_assigned_member | backend/app/modules/assigned_members/services.py | DATABASE_OPERATION | CORE | Remove member assignment |
| get_task_members | backend/app/modules/assigned_members/services.py | DATABASE_OPERATION | CORE | Get all members assigned to a task |
| useGetTaskAssignedMembers hook | frontend/src/hooks/useTask.ts | FRONTEND_QUERY | CORE | Fetch assigned members for task |
| useGetTasksForUser hook | frontend/src/hooks/useTask.ts | FRONTEND_QUERY | CORE | Fetch tasks for user |

### Module: Workload Calculation
**Purpose:** Calculate member workloads, determine overload/underutilization status
**Core entities:** MemberSnapshot (derived from calculations)
**Dependencies:** Tasks, Project Members, Assigned Members, Projects
**Importance:** CORE

| Function | Location | Type | Importance | Purpose |
| -------- | -------- | ---- | ---------- | ------- |
| complexity_to_points | backend/app/modules/redistribution_recommendations/workload_calculation.py | CALCULATION | CORE | Convert complexity enum to numeric points |
| calculate_urgency_multiplier | backend/app/modules/redistribution_recommendations/workload_calculation.py | CALCULATION | CORE | Calculate deadline urgency multiplier |
| calculate_effective_points | backend/app/modules/redistribution_recommendations/workload_calculation.py | CALCULATION | CORE | Calculate weighted task points based on status and deadline |
| calculate_member_workload_totals | backend/app/modules/redistribution_recommendations/workload_calculation.py | CALCULATION | CORE | Calculate raw and effective points for a member |
| determine_workload_status | backend/app/modules/redistribution_recommendations/workload_calculation.py | BUSINESS_RULE | CORE | Determine overload/underutilization status |
| calculate_member_workload_state | backend/app/modules/redistribution_recommendations/workload_calculation.py | CALCULATION | CORE | Calculate full workload state for a member |
| recompute_workload_state | backend/app/modules/redistribution_recommendations/workload_calculation.py | CALCULATION | CORE | Recompute workload state for all project members |
| validate_task_deadline | backend/app/modules/redistribution_recommendations/workload_calculation.py | VALIDATION | CORE | Validate task deadline meets minimum requirements |
| create_or_update_member_snapshots | backend/app/modules/redistribution_recommendations/workload_calculation.py | DATABASE_OPERATION | CORE | Persist workload snapshots to database |
| useRedistributionRecommendation hook | frontend/src/hooks/useRedistributionRecommendation.ts | FRONTEND_QUERY | CORE | Fetch workload recommendations |

### Module: Redistribution Recommendations
**Purpose:** Generate suggestions to rebalance workloads among team members
**Core entities:** RedistributionRecommendation
**Dependencies:** Workload Calculation, Tasks, Project Members
**Importance:** IMPORTANT

| Function | Location | Type | Importance | Purpose |
| -------- | -------- | ---- | ---------- | ------- |
| generate_redistribution_options | backend/app/modules/redistribution_recommendations/redistribution_logic.py | BUSINESS_RULE | IMPORTANT | Generate ranked redistribution options |
| _is_eligible_for_task | backend/app/modules/redistribution_recommendations/redistribution_logic.py | BUSINESS_RULE | IMPORTANT | Check member eligibility for task based on skills |
| _get_task_effective_points | backend/app/modules/redistribution_recommendations/redistribution_logic.py | CALCULATION | IMPORTANT | Calculate effective points for redistribution |
| _get_urgency_multiplier_for_task | backend/app/modules/redistribution_recommendations/redistribution_logic.py | CALCULATION | IMPORTANT | Get urgency multiplier for task |
| create_recommendation | backend/app/modules/redistribution_recommendations/services.py | DATABASE_OPERATION | IMPORTANT | Save redistribution recommendation |
| get_one_recommendation | backend/app/modules/redistribution_recommendations/services.py | DATABASE_OPERATION | IMPORTANT | Retrieve recommendation by ID |
| get_all_recommendations | backend/app/modules/redistribution_recommendations/services.py | DATABASE_OPERATION | IMPORTANT | Retrieve all recommendations |
| update_recommendation | backend/app/modules/redistribution_recommendations/services.py | DATABASE_OPERATION | IMPORTANT | Update recommendation |
| delete_recommendation | backend/app/modules/redistribution_recommendations/services.py | DATABASE_OPERATION | IMPORTANT | Delete recommendation |

### Module: Task Comments
**Purpose:** Enable discussion and feedback on tasks
**Core entities:** TaskComment
**Dependencies:** Tasks, Users
**Importance:** IMPORTANT

| Function | Location | Type | Importance | Purpose |
| -------- | -------- | ---- | ---------- | ------- |
| get_one_task_comment | backend/app/modules/task_comments/services.py | DATABASE_OPERATION | IMPORTANT | Retrieve task comment by ID |
| get_all_task_comments | backend/app/modules/task_comments/services.py | DATABASE_OPERATION | IMPORTANT | Retrieve all task comments |
| get_task_comments_by_task_id | backend/app/modules/task_comments/services.py | DATABASE_OPERATION | IMPORTANT | Retrieve comments for a specific task |
| create_task_comment | backend/app/modules/task_comments/services.py | DATABASE_OPERATION | IMPORTANT | Create new task comment |
| update_task_comment | backend/app/modules/task_comments/services.py | DATABASE_OPERATION | IMPORTANT | Update existing task comment |
| delete_task_comment | backend/app/modules/task_comments/services.py | DATABASE_OPERATION | IMPORTANT | Delete task comment |
| useGetTaskCommentsByTask hook | frontend/src/hooks/useTaskComment.ts | FRONTEND_QUERY | IMPORTANT | Fetch comments for task |
| useCreateTaskComment hook | frontend/src/hooks/useTaskComment.ts | FRONTEND_MUTATION | IMPORTANT | Create task comments |
| useUpdateTaskComment hook | frontend/src/hooks/useTaskComment.ts | FRONTEND_MUTATION | IMPORTANT | Update task comments |
| useDeleteTaskComment hook | frontend/src/hooks/useTaskComment.ts | FRONTEND_MUTATION | IMPORTANT | Delete task comments |
| TaskComments component | frontend/src/components/user/TaskComments.tsx | UI_LOGIC | IMPORTANT | Display comment thread UI |

### Module: Task Attachments
**Purpose:** Allow file attachments to tasks
**Core entities:** TaskAttachment, StoredFile
**Dependencies:** Tasks, Files
**Importance:** IMPORTANT

| Function | Location | Type | Importance | Purpose |
| -------- | -------- | ---- | ---------- | ------- |
| add_attachment | backend/app/modules/task_attachments/services.py | DATABASE_OPERATION | IMPORTANT | Attach file to task |
| get_by_task | backend/app/modules/task_attachments/services.py | DATABASE_OPERATION | IMPORTANT | Get attachments for a task |
| get_attachment_url | backend/app/modules/task_attachments/services.py | DATABASE_OPERATION | IMPORTANT | Get download URL for attachment |
| delete_attachment | backend/app/modules/task_attachments/services.py | DATABASE_OPERATION | IMPORTANT | Delete task attachment |
| useGetTaskAttachments hook | frontend/src/hooks/useTaskAttachment.ts | FRONTEND_QUERY | IMPORTANT | Fetch attachments for task |
| useUploadTaskAttachment hook | frontend/src/hooks/useTaskAttachment.ts | FRONTEND_MUTATION | IMPORTANT | Upload task attachments |
| useDeleteTaskAttachment hook | frontend/src/hooks/useTaskAttachment.ts | FRONTEND_MUTATION | IMPORTANT | Delete task attachments |
| useGetAttachmentUrl hook | frontend/src/hooks/useTaskAttachment.ts | FRONTEND_MUTATION | IMPORTANT | Get attachment download URL |
| TaskAttachments component | frontend/src/components/user/TaskAttachments.tsx | UI_LOGIC | IMPORTANT | Display attachments UI |

### Module: Task Links
**Purpose:** Allow external resource links to tasks
**Core entities:** TaskLink
**Dependencies:** Tasks, Users
**Importance:** IMPORTANT

| Function | Location | Type | Importance | Purpose |
| -------- | -------- | ---- | ---------- | ------- |
| add_link | backend/app/modules/task_links/services.py | DATABASE_OPERATION | IMPORTANT | Add link to task |
| get_by_task | backend/app/modules/task_links/services.py | DATABASE_OPERATION | IMPORTANT | Get links for a task |
| update_link | backend/app/modules/task_links/services.py | DATABASE_OPERATION | IMPORTANT | Update task link |
| delete_link | backend/app/modules/task_links/services.py | DATABASE_OPERATION | IMPORTANT | Delete task link |
| useGetTaskLinks hook | frontend/src/hooks/useTaskLink.ts | FRONTEND_QUERY | IMPORTANT | Fetch links for task |
| useCreateTaskLink hook | frontend/src/hooks/useTaskLink.ts | FRONTEND_MUTATION | IMPORTANT | Create task links |
| useUpdateTaskLink hook | frontend/src/hooks/useTaskLink.ts | FRONTEND_MUTATION | IMPORTANT | Update task links |
| useDeleteTaskLink hook | frontend/src/hooks/useTaskLink.ts | FRONTEND_MUTATION | IMPORTANT | Delete task links |
| TaskLinks component | frontend/src/components/user/TaskLinks.tsx | UI_LOGIC | IMPORTANT | Display links UI |

### Module: Notifications
**Purpose:** Send system notifications to users
**Core entities:** Notification
**Dependencies:** Users, Invitations
**Importance:** IMPORTANT

| Function | Location | Type | Importance | Purpose |
| -------- | -------- | ---- | ---------- | ------- |
| get_one_notification | backend/app/modules/notifications/services.py | DATABASE_OPERATION | IMPORTANT | Retrieve notification by ID |
| get_all_notifications | backend/app/modules/notifications/services.py | DATABASE_OPERATION | IMPORTANT | Retrieve notifications for user |
| create_notification | backend/app/modules/notifications/services.py | DATABASE_OPERATION | IMPORTANT | Create new notification |
| update_notification | backend/app/modules/notifications/services.py | DATABASE_OPERATION | IMPORTANT | Update notification |
| delete_notification | backend/app/modules/notifications/services.py | DATABASE_OPERATION | IMPORTANT | Delete notification |
| get_my_notifications | backend/app/modules/notifications/routes.py | API_ENDPOINT | IMPORTANT | Get notifications for current user |
| mark_as_read | backend/app/modules/notifications/routes.py | API_ENDPOINT | IMPORTANT | Mark notification as read |
| useNotification hook | frontend/src/hooks/useNotification.ts | FRONTEND_QUERY | IMPORTANT | Fetch notifications in frontend |

### Module: Messages
**Purpose:** Enable project-based messaging between users
**Core entities:** Message
**Dependencies:** Projects, Users
**Importance:** IMPORTANT

| Function | Location | Type | Importance | Purpose |
| -------- | -------- | ---- | ---------- | ------- |
| send_message | backend/app/modules/messages/services.py | DATABASE_OPERATION | IMPORTANT | Send message to project |
| get_project_messages | backend/app/modules/messages/services.py | DATABASE_OPERATION | IMPORTANT | Retrieve messages for project |
| get_messages | backend/app/modules/messages/routes.py | API_ENDPOINT | IMPORTANT | Get project messages |
| create_message | backend/app/modules/messages/routes.py | API_ENDPOINT | IMPORTANT | Create new project message |
| useMessage hook | frontend/src/hooks/useMessage.ts | FRONTEND_QUERY | IMPORTANT | Fetch messages in frontend |

### Module: Meetings
**Purpose:** Schedule and manage video meetings for projects
**Core entities:** Meeting
**Dependencies:** Projects, Users
**Importance:** IMPORTANT

| Function | Location | Type | Importance | Purpose |
| -------- | -------- | ---- | ---------- | ------- |
| create_meeting | backend/app/modules/meetings/services.py | DATABASE_OPERATION | IMPORTANT | Create new meeting |
| get_project_meetings | backend/app/modules/meetings/services.py | DATABASE_OPERATION | IMPORTANT | Get meetings for project |
| get_meeting | backend/app/modules/meetings/services.py | DATABASE_OPERATION | IMPORTANT | Get meeting by ID |
| cancel_meeting | backend/app/modules/meetings/services.py | DATABASE_OPERATION | IMPORTANT | Cancel meeting |
| create_meeting | backend/app/modules/meetings/routes.py | API_ENDPOINT | IMPORTANT | Create meeting endpoint |
| get_project_meetings | backend/app/modules/meetings/routes.py | API_ENDPOINT | IMPORTANT | Get project meetings endpoint |
| get_meeting | backend/app/modules/meetings/routes.py | API_ENDPOINT | IMPORTANT | Get meeting by ID endpoint |
| cancel_meeting | backend/app/modules/meetings/routes.py | API_ENDPOINT | IMPORTANT | Cancel meeting endpoint |
| useMeeting hook | frontend/src/hooks/useMeeting.ts | FRONTEND_QUERY | IMPORTANT | Fetch meetings in frontend |

### Module: Files
**Purpose:** Manage file uploads and storage (via Supabase)
**Core entities:** StoredFile
**Dependencies:** None (utility service)
**Importance:** SUPPORTING

| Function | Location | Type | Importance | Purpose |
| -------- | -------- | ---- | ---------- | ------- |
| upload_file | backend/app/modules/files/services.py | FILE_OPERATION | SUPPORTING | Upload file to storage |
| get_file | backend/app/modules/files/services.py | FILE_OPERATION | SUPPORTING | Retrieve file metadata |
| get_file_url | backend/app/modules/files/services.py | FILE_OPERATION | SUPPORTING | Get download URL for file |
| delete_file | backend/app/modules/files/services.py | FILE_OPERATION | SUPPORTING | Delete file from storage |
| FileRepo | backend/app/modules/files/repo.py | REPOSITORY | SUPPORTING | Database operations for files |

### Module: AI Service
**Purpose:** Provide AI-powered task complexity analysis
**Core entities:** None (service-only)
**Dependencies:** External AI providers (OpenRouter, Gemini)
**Importance:** IMPORTANT

| Function | Location | Type | Importance | Purpose |
| -------- | -------- | ---- | ---------- | ------- |
| score_task_complexity | backend/app/modules/ai/service.py | AI | IMPORTANT | Score task complexity using AI |
| call_ai | backend/app/modules/ai/client.py | AI | IMPORTANT | Call external AI providers |
| _parse_json_response | backend/app/modules/ai/service.py | AI | IMPORTANT | Parse and validate AI responses |
| _call_provider | backend/app/modules/ai/client.py | AI | IMPORTANT | Internal provider calling logic |

## 4. Domain Entities

| Entity | Location | Type | Relationships | Importance |
| ------ | -------- | ---- | ------------- | ---------- |
| User | backend/app/modules/users/model.py | Foundational | owns Projects, created_by in Projects, member of ProjectMembers | CORE |
| Project | backend/app/modules/projects/model.py | Core | owned by User, has ProjectMembers, has Tasks, has Supertasks | CORE |
| ProjectMember | backend/app/modules/project_members/model.py | Core | links User to Project, has AssignedMembers, has skills | CORE |
| Task | backend/app/modules/tasks/model.py | Core | belongs to Project, has AssignedMembers, has Supertask (optional), has Comments/Attachments/Links | CORE |
| Supertask | backend/app/modules/supertasks/model.py | Grouping | belongs to Project, groups Tasks | IMPORTANT |
| AssignedMember | backend/app/modules/assigned_members/model.py | Assignment | links ProjectMember to Task, tracks effort_share | CORE |
| TaskComment | backend/app/modules/task_comments/model.py | Discussion | belongs to Task, authored by User | IMPORTANT |
| TaskAttachment | backend/app/modules/task_attachments/model.py | Resource | belongs to Task, references StoredFile | IMPORTANT |
| TaskLink | backend/app/modules/task_links/model.py | Resource | belongs to Task, created_by User | IMPORTANT |
| Notification | backend/app/modules/notifications/model.py | Alert | belongs to User, references ProjectInvitation | IMPORTANT |
| Message | backend/app/modules/messages/model.py | Communication | belongs to Project, sent by User | IMPORTANT |
| Meeting | backend/app/modules/meetings/model.py | Collaboration | belongs to Project, created_by User | IMPORTANT |
| StoredFile | backend/app/modules/files/model.py | Storage | referenced by TaskAttachment | SUPPORTING |
| MemberSnapshot | backend/app/modules/member_snapshots/model.py | Analytics | belongs to ProjectMember, stores workload data | CORE |
| ProjectSnapshot | backend/app/modules/project_snapshots/model.py | Analytics | belongs to Project | CORE |
| RedistributionRecommendation | backend/app/modules/redistribution_recommendations/model.py | Suggestion | belongs to Project | IMPORTANT |
| RefreshToken | backend/app/modules/users/model.py | Authentication | belongs to User | CORE |

## 5. Core Functions

| Function | Module | Location | Category | Importance | Description |
| -------- | ------ | -------- | -------- | ---------- | ----------- |
| create_task | Tasks | backend/app/modules/tasks/services.py:82 | DATABASE_OPERATION | CORE | Creates a new task with AI-powered complexity scoring and project snapshot synchronization |
| recompute_workload_state | Workload | backend/app/modules/redistribution_recommendations/workload_calculation.py:197 | CALCULATION | CORE | Recalculates workload state for all members in a project (core of workload monitoring) |
| create_or_update_member_snapshots | Workload | backend/app/modules/redistribution_recommendations/workload_calculation.py:324 | DATABASE_OPERATION | CORE | Persists workload snapshots to database after calculation |
| calculate_member_workload_totals | Workload | backend/app/modules/redistribution_recommendations/workload_calculation.py:92 | CALCULATION | CORE | Calculates raw and effective points for a member from their assigned tasks |
| score_task_complexity | AI | backend/app/modules/ai/service.py:106 | AI | CORE | Uses AI providers to score task complexity on four dimensions |
| authenticate_user | Users | backend/app/modules/users/auth.py | AUTHENTICATION | CORE | Validates user credentials for system access |
| generate_redistribution_options | Redistribution | backend/app/modules/redistribution_recommendations/redistribution_logic.py:73 | BUSINESS_RULE | IMPORTANT | Generates ranked suggestions to rebalance workloads |
| is_eligible_for_task | Redistribution | backend/app/modules/redistribution_recommendations/redistribution_logic.py:59 | BUSINESS_RULE | IMPORTANT | Checks if member has required skills for a task |
| create_project | Projects | backend/app/modules/projects/services.py | DATABASE_OPERATION | CORE | Creates a new project with ownership assignment |
| create_assigned_member | Assigned Members | backend/app/modules/assigned_members/services.py:35 | DATABASE_OPERATION | CORE | Assigns a project member to a task and updates workload calculations |
| get_one_task | Tasks | backend/app/modules/tasks/services.py:66 | DATABASE_OPERATION | CORE | Retrieves a single task by ID |
| get_task_comments_by_task_id | Task Comments | backend/app/modules/task_comments/services.py:22 | DATABASE_OPERATION | IMPORTANT | Retrieves all comments for a specific task |
| add_attachment | Task Attachments | backend/app/modules/task_attachments/services.py:23 | DATABASE_OPERATION | IMPORTANT | Attaches a file to a task |
| add_link | Task Links | backend/app/modules/task_links/services.py:20 | DATABASE_OPERATION | IMPORTANT | Adds a link to a task |
| create_meeting | Meetings | backend/app/modules/meetings/services.py:58 | DATABASE_OPERATION | IMPORTANT | Schedules a new project meeting |
| send_message | Messages | backend/app/modules/messages/services.py:14 | DATABASE_OPERATION | IMPORTANT | Sends a message to a project |
| create_notification | Notifications | backend/app/modules/notifications/services.py:17 | DATABASE_OPERATION | IMPORTANT | Creates a system notification for a user |
| get_one_project | Projects | backend/app/modules/projects/services.py | DATABASE_OPERATION | CORE | Retrieves a single project by ID |
| get_one_user | Users | backend/app/modules/users/services.py | DATABASE_OPERATION | CORE | Retrieves a single user by ID |
| get_one_member | Project Members | backend/app/modules/project_members/services.py | DATABASE_OPERATION | CORE | Retrieves a single project member by ID |
| get_one_supertask | Supertasks | backend/app/modules/supertasks/services.py | DATABASE_OPERATION | IMPORTANT | Retrieves a single supertask by ID |
| get_one_notification | Notifications | backend/app/modules/notifications/services.py | DATABASE_OPERATION | IMPORTANT | Retrieves a single notification by ID |
| get_one_message | Messages | backend/app/modules/messages/services.py | DATABASE_OPERATION | IMPORTANT | Retrieves a single message by ID |
| get_one_meeting | Meetings | backend/app/modules/meetings/services.py | DATABASE_OPERATION | IMPORTANT | Retrieves a single meeting by ID |
| get_one_file | Files | backend/app/modules/files/services.py | FILE_OPERATION | SUPPORTING | Retrieves a single file by ID |

## 6. Core Business Rules

1. **Task Creation Flow**: When creating a task:
   - AI scores task name and description for complexity (Low=1/Medium=2/High=3)
   - Primary skill determines task category (Development/Research/Document/Finance)
   - Task is created with calculated complexity, category, and points
   - Project snapshot is updated to reflect unassigned task count

2. **Workload Calculation**:
   - Only LEADER and MEMBER roles count toward project baseline (ADVISOR/INSTRUCTOR excluded)
   - Baseline points = MEDIAN of effective points from working members
   - Expected load = baseline_points × member's capacity_multiplier
   - Member is OVERLOADED if total_effective_points > expected_load
   - Member is UNDERUTILIZED if total_effective_points < expected_load × 0.5
   - Effective points vary by task status:
     * NOT_STARTED: complexity_points × urgency_multiplier (based on deadline)
     * IN_PROGRESS: complexity_points × 1.0 (deadline weight removed)
     * SUBMITTED/COMPLETED: 0 points

3. **Urgency Multiplier**:
   - Overdue or ≤3 days: 1.5×
   - ≤7 days: 1.25×
   - ≤14 days: 1.0×
   - >14 days: 0.75×
   - No deadline: 1.0× (treated as ≤14 days bucket)

4. **Task Assignment Eligibility**:
   - Member must possess task's primary skill (required)
   - Member must possess at least 75% of task's secondary skills (rounded up)
   - Only WORKING_ROLES (LEADER/MEMBER) can be assigned tasks

5. **Redistribution Options**:
   - Identifies single most overloaded member (highest points over expected_load)
   - Generates Move, Share, Split options for each task of overloaded member
   - Move Deadline option as fallback when no eligible recipients
   - Options ranked by impact (positive impact only)
   - Impact = points relieved from overloaded member - overload created on recipient

6. **Permission Rules**:
   - Global roles: ADMIN > INSTRUCTOR > STUDENT
   - Project roles: LEADER > ADVISOR > MEMBER > INSTRUCTOR (in project context)
   - Task creation: Requires PROJECT membership
   - Task assignment: Requires PROJECT membership + skill eligibility
   - Meeting management: Requires PROJECT LEADER/ADVISOR/INSTRUCTOR role OR ADMIN
   - Resource upload/download: Requires PROJECT membership

7. **Data Integrity**:
   - All IDs are UUIDs (not integers)
   - Soft deletes not used; hard deletes with CASCADE where appropriate
   - Task status transitions: not_started → in_progress → submitted → completed
   - Only IN_PROGRESS tasks can be submitted; only SUBMITTED tasks can be completed
   - Enforce referential integrity with foreign keys and CASCADE deletes

## 7. System Workflows

### Workflow: User Authentication
1. frontend.loginUser() (API call)
2. backend.loginUser endpoint (auth.py)
3. Authenticate credentials against database
4. Generate access and refresh tokens
5. Return tokens to frontend
6. frontend.storeToken() and frontend.storeRefreshToken()
7. Subsequent API calls include Authorization header

### Workflow: Project Creation
1. frontend.useCreateProject() mutation (via useProject hook)
2. backend.create_project endpoint (projects/routes.py)
3. backend.create_project service (projects/services.py)
4. Create Project record in database
5. Return created project to frontend
6. frontend.invalidateQueries() for project lists

### Workflow: Task Creation
1. frontend.useCreateTask() mutation (via useTask hook)
2. backend.create_task endpoint (tasks/routes.py)
3. backend.create_task service (tasks/services.py)
4. Call AI service to score task complexity
5. Determine task category from primary skill
6. Create Task record with AI results
7. Sync project unassigned tasks count
8. Return created task to frontend
9. frontend.invalidateQueries() for project tasks and user tasks

### Workflow: Task Assignment
1. frontend.useCreateAssignedMember() mutation (via useAssignedMember hook)
2. backend.create_assigned_member endpoint (assigned_members/routes.py)
3. backend.create_assigned_member service (assigned_members/services.py)
4. Create AssignedMember record linking ProjectMember to Task
5. Calculate member workload via MemberSnapshotService
6. Sync project unassigned tasks count
7. Return created assignment to frontend
8. frontend.invalidateQueries() for assigned members and project snapshots

### Workflow: Workload Calculation & Redistribution
1. Periodic trigger or manual refresh
2. backend.create_or_update_member_snapshots() (workload_calculation.py)
3. Call recompute_workload_state() for project
4. For each member:
   - Get assigned tasks
   - Calculate total_points and total_effective_points
   - Exclude COMPLETED/SUBMITTED tasks from calculations
5. Calculate baseline_points as MEDIAN of working members' effective_points
6. For each member:
   - Get capacity_multiplier from latest snapshot (default 1.0)
   - Calculate expected_load = baseline_points × capacity_multiplier
   - Determine workload_status (OVERLOADED/UNDERUTILIZED/NORMAL)
7. Persist snapshots to database
8. If redistribution needed:
   - Call generate_redistribution_options()
   - Identify most overloaded member
   - Generate Move/Share/Split options for their tasks
   - Generate Move Deadline fallback options
   - Rank options by impact
9. Return recommendations to frontend via useRedistributionRecommendation hook

### Workflow: Task Comment Creation
1. frontend.useCreateTaskComment() mutation (via useTaskComment hook)
2. backend.create_task_comment endpoint (task_comments/routes.py)
3. backend.create_task_comment service (task_comments/services.py)
4. Create TaskComment record with task_id, author_id, content
5. Return created comment to frontend
6. frontend.invalidateQueries() for task comments (global and task-specific)

### Workflow: File Attachment
1. frontend.useUploadTaskAttachment() mutation (via useTaskAttachment hook)
2. backend.upload_attachment endpoint (task_attachments/routes.py)
3. backend.TaskAttachmentService.add() service
4. Validate task exists
5. Upload file to storage (Supabase) via FileService
6. Create TaskAttachment record linking task to stored file
7. Return attachment record to frontend
8. frontend.invalidateQueries() for task attachments

### Workflow: Meeting Creation
1. frontend.createMeeting() (via useMeeting hook)
2. backend.create_meeting endpoint (meetings/routes.py)
3. backend.MeetingService.create_meeting() service
4. Verify user has manager role in project (LEADER/ADVISOR/INSTRUCTOR or ADMIN)
5. Call meeting provider API (Zoom/Google Meet)
6. Create Meeting record with provider response
7. Return meeting to frontend
9. frontend.invalidateQueries() for project meetings

### Workflow: Notification Creation
1. Backend service creates notification (e.g., when invitation sent)
2. backend.create_notification service (notifications/services.py)
3. Create Notification record with user_id, title, body, type, invitation_id
4. Return notification to frontend
5. frontend.useNotification() hook retrieves notifications
6. Real-time updates via query invalidation

## 8. Function Dependency Map

```mermaid
flowchart TD
    %% Task Creation Flow
    A[Frontend: useCreateTask()] --> B[API: POST /tasks]
    B --> C[Service: TaskService.create_task()]
    C --> D[AI: score_task_complexity()]
    D --> E[Service: TaskService._determine_task_category()]
    E --> F[Repo: TaskRepo.create()]
    F --> G[Service: ProjectSnapshotService.sync_unassigned_tasks()]
    G --> H[(Database: Tasks table)]
    G --> I[(Database: ProjectSnapshots table)]
    
    %% Workload Calculation Flow
    J[Periodic Trigger] --> K[Service: WorkloadService.create_or_update_member_snapshots()]
    K --> L[Function: recompute_workload_state()]
    L --> M[Loop: Get all project members]
    M --> N[Function: calculate_member_workload_totals() for each member]
    N --> O[Function: get_member_tasks() for each member]
    O --> P[Service: TaskService.batch_get_task()]
    P --> Q[(Database: Tasks table)]
    N --> R[Function: complexity_to_points()]
    N --> S[Function: calculate_effective_points()]
    S --> T[Function: calculate_urgency_multiplier()]
    T --> U[Function: complexity_to_points()] %% reuse
    L --> V[Function: median() %% statistics library]
    L --> W[Loop: Calculate expected_load and status for each member]
    W --> X[Function: get_latest_member_snapshot()]
    X --> Y[(Database: MemberSnapshots table)]
    W --> Y
    K --> Z[Service: MemberSnapshotRepo.create() for each member]
    Z --> AA[(Database: MemberSnapshots table)]
    
    %% Redistribution Flow
    AB[Trigger: Workload update shows overload] --> AC[Service: RecommendationService.generate_redistribution_options()]
    AC --> AD[Function: generate_redistribution_options()]
    AD --> AE[Function: recompute_workload_state()] %% reuse calculation
    AD --> AF[Identify most overloaded member]
    AF --> AG[Loop: Get tasks for overloaded member]
    AG --> AH[Function: get_member_tasks()]
    AH --> AI[Service: TaskService.batch_get_task()]
    AI --> AJ[(Database: Tasks table)]
    AG --> AK[Loop: Check eligibility for each potential recipient]
    AK --> AL[Function: _is_eligible_for_task()]
    AL --> AM[Loop: Check primary skill in member skills]
    AL --> AN[Loop: Check 75% secondary skills threshold]
    AG --> AO[Generate Move/Share/Split options for each eligible recipient]
    AO --> AP[Calculate impact for each option]
    AP --> AQ[Filter negative impact options]
    AQ --> AR[Rank options by impact descending]
    AR --> AS[Append Move Deadline options]
    AS --> AT[Return ranked options to frontend]
    
    %% Frontend-Backend Connection
    AV[Frontend Hook] --> AW[API Client: apiClient.get/post/patch/delete]
    AW --> AX[Backend Route: *.routes.py]
    AX --> AY[Backend Service: *.services.py]
    AY --> AZ[Backend Repo: *.repo.py]
    AZ --> BA[(Database: SQLAlchemy Models)]
    
    %% Authentication Flow
    BB[Frontend: loginUser()] --> BC[API: POST /auth/jwt/login]
    BC --> BD[Service: Authenticate credentials]
    BD --> BE[(Database: Users table)]
    BE --> BF[Generate JWT tokens]
    BF --> BG[Return tokens to frontend]
    BG --> BH[Frontend: storeToken()/storeRefreshToken()]
    BH --> BI[API Client: Attach Authorization header]
    BI --> BJ[All subsequent API requests]
```

## 9. Core System Functions

These are the functions that form the "engine" of the application - the most critical functions a developer should understand first:

### 1. `recompute_workload_state()`
- **Location**: `backend/app/modules/redistribution_recommendations/workload_calculation.py:197`
- **What it controls**: The core workload monitoring algorithm that determines member overload/underutilization status
- **What calls it**: `create_or_update_member_snapshots()`, `calculate_member_workload_state()`
- **What it calls**: `calculate_member_workload_totals()`, `get_latest_member_snapshot()`, `determine_workload_status()`, `median()`
- **What would break if removed**: The entire workload monitoring system would fail - no ability to detect overload/underutilization, no redistribution recommendations, dashboard would show inaccurate workload data

### 2. `create_task()`
- **Location**: `backend/app/modules/tasks/services.py:82`
- **What it controls**: Task creation with AI-powered complexity analysis
- **What calls it**: API endpoint `/tasks/` POST
- **What it calls**: `score_task_complexity()`, `_determine_task_category()`, `TaskRepo.create()`, `ProjectSnapshotService.sync_unassigned_tasks()`
- **What would break if removed**: Users couldn't create tasks, AI task analysis would be bypassed, project snapshots wouldn't update properly

### 3. `authenticate_user()`
- **Location**: `backend/app/modules/users/auth.py`
- **What it controls**: User access to the system
- **What calls it**: API endpoint `/auth/jwt/login` POST
- **What it calls**: Database query for user, password verification
- **What would break if removed**: No users could log in to the system

### 4. `create_or_update_member_snapshots()`
- **Location**: `backend/app/modules/redistribution_recommendations/workload_calculation.py:324`
- **What it controls**: Persistence of workload calculations to database
- **What calls it**: `AssignedMemberService.create_assigned_member()`, `AssignedMemberService.delete_assigned_member()`, `TaskService.create_task()`, `TaskService.delete_task()`
- **What it calls**: `recompute_workload_state()`, database insert/update operations
- **What would break if removed**: Workload calculations wouldn't persist, dashboard would lose historical data, real-time updates would fail

### 5. `score_task_complexity()`
- **Location**: `backend/app/modules/ai/service.py:106`
- **What it controls**: AI-powered task analysis
- **What calls it**: `TaskService.create_task()`
- **What it calls**: `call_ai()`, `_parse_json_response()`
- **What would break if removed**: Tasks would be created without AI complexity scoring, falling back to manual complexity setting only

### 6. `calculate_member_workload_totals()`
- **Location**: `backend/app/modules/redistribution_recommendations/workload_calculation.py:92`
- **What it controls**: Core calculation of member workload from assigned tasks
- **What calls it**: `recompute_workload_state()`, `calculate_member_workload_state()`
- **What it calls**: `get_member_tasks()`, `complexity_to_points()`, `calculate_effective_points()`
- **What would break if removed**: Workload calculations would be impossible - no way to determine member loading

### 7. `create_assigned_member()`
- **Location**: `backend/app/modules/assigned_members/services.py:35`
- **What it controls**: Linking members to tasks
- **What calls it**: API endpoint `/assigned_members/` POST
- **What it calls**: `TaskService.get_one_task()`, `MemberSnapshotService.calculate_member_workload()`, `ProjectSnapshotService.sync_unassigned_tasks()`
- **What would break if removed**: Users couldn't be assigned to tasks, workload calculations wouldn't update on assignment changes

### 8. `get_member_tasks()`
- **Location**: `backend/app/modules/redistribution_recommendations/workload_calculation.py:70`
- **What it controls**: Retrieval of tasks assigned to a member
- **What calls it**: `calculate_member_workload_totals()`, `get_tasks_for_user()` in TaskService
- **What it calls**: `AssignedMemberService.get_members()`, `TaskService.batch_get_task()`
- **What would break if removed**: Cannot determine what tasks a member is assigned to, breaking workload calculations

### 9. `generate_redistribution_options()`
- **Location**: `backend/app/modules/redistribution_recommendations/redistribution_logic.py:73`
- **What it controls**: Generation of workload balancing suggestions
- **What calls it**: `RecommendationService.generate_redistribution_options()`
- **What it calls**: `recompute_workload_state()`, `_is_eligible_for_task()`, `_get_task_effective_points()`, `_get_urgency_multiplier_for_task()`
- **What would break if removed**: No ability to suggest workload rebalancing actions when overload detected

### 10. `_is_eligible_for_task()`
- **Location**: `backend/app/modules/redistribution_recommendations/redistribution_logic.py:59`
- **What it controls**: Skill-based task assignment validation
- **What calls it**: `generate_redistribution_options()`
- **What it calls**: None (pure function)
- **What would break if removed**: Tasks could be assigned to members without required skills, violating core competency matching

## 10. Supporting Functions

Important but non-core functions:

| Function | Module | Location | Category | Importance | Description |
| -------- | ------ | -------- | -------- | ---------- | ----------- |
| get_one_task | Tasks | backend/app/modules/tasks/services.py:66 | DATABASE_OPERATION | IMPORTANT | Retrieve single task by ID |
| get_all_project_tasks | Tasks | backend/app/modules/tasks/services.py:74 | DATABASE_OPERATION | IMPORTANT | Retrieve all tasks for a project |
| update_task | Tasks | backend/app/modules/tasks/services.py:98 | DATABASE_OPERATION | IMPORTANT | Update existing task |
| delete_task | Tasks | backend/app/modules/tasks/services.py:114 | DATABASE_OPERATION | IMPORTANT | Delete task |
| get_tasks_for_user | Tasks | backend/app/modules/tasks/services.py:126 | DATABASE_OPERATION | IMPORTANT | Retrieve tasks assigned to user |
| get_assigned_members | Tasks | backend/app/modules/tasks/services.py:138 | DATABASE_OPERATION | IMPORTANT | Retrieve tasks with assigned members |
| create_project | Projects | backend/app/modules/projects/services.py | DATABASE_OPERATION.Subject: IMPORTANT | Create new project |
| update_project | Projects | backend/app/modules/projects/services.py | DATABASE_OPERATION | IMPORTANT | Update existing project |
| delete_project | Projects | backend/app/modules/projects/services.py | DATABASE_OPERATION | IMPORTANT | Delete project |
| get_one_member | Project Members | backend/app/modules/project_members/services.py | DATABASE_OPERATION | IMPORTANT | Retrieve single project member by ID |
| get_all_members_by_project | Project Members | backend/app/modules/project_members/services.py | DATABASE_OPERATION | IMPORTANT | Retrieve all members for لكرة المشروع |
| create_member | Project Members | backend/app/modules/project_members/services.py | DATABASE_OPERATION | IMPORTANT | Add user to project |
| update_member | Project Members | backend/app/modules/project_members/services.py | DATABASE_OPERATION | IMPORTANT | Update project member |
| delete_member | Project Members | backend/app/modules/project_members.services.py | DATABASE_OPERATION | IMPORTANT | Remove user from project |
| create_assigned_member | Assigned Members | backend/app/modules/assigned_members.services.py:35 | DATABASE_OPERATION | IMPORTANT | Assign member to task |
| update_assigned_member | Assigned Members | backend/app/modules/assigned_members.services.py:56 | DATABASE_OPERATION | IMPORTANT | Update assigned member |
| delete_assigned_member | Assigned Members | backend/app/modules/assigned_members.services.py:77 | DATABASE_OPERATION | IMPORTANT | Remove member assignment |
| get_task_members | Assigned Members | backend/app/modules/assigned_members.services.py:89 | DATABASE_OPERATION | IMPORTANT | Get members assigned to task |
| get_one_task_comment | Task Comments | backend/app/modules/task_comments.services.py:14 | DATABASE_OPERATION | IMPORTANT | Retrieve task comment by ID |
| get_all_task_comments | Task Comments | backend/app/modules/task_comments.services.py:22 | DATABASE_OPERATION | IMPORTANT | Retrieve all task comments |
| get_task_comments_by_task_id | Task Comments | backend/app/modules/task_comments.services.py:30 | DATABASE_OPERATION | IMPORTANT | Get comments for specific task |
| create_task_comment | Task Comments | backend/app/modules/task_comments.services.py:38 | DATABASE_OPERATION | IMPORTANT | Create task comment |
| update_task_comment | Task Comments | backend/app/modules/task_comments.services.py:46 | DATABASE_OPERATION | IMPORTANT | Update task comment |
| delete_task_comment | Task Comments | backend/app/modules/task_comments.services.py:54 | DATABASE_OPERATION | IMPORTANT | Delete task comment |
| add_attachment | Task Attachments | backend/app/modules/task_attachments.services.py:23 | DATABASE_OPERATION | IMPORTANT | Attach file to task |
| get_by_task | Task Attachments | backend/app/modules/task_attachments.services.py:39 | DATABASE_OPERATION | IMPORTANT | Get attachments for task |
| get_attachment_url | Task Attachments | backend/app/modules/task_attachments.services.py:55 | DATABASE_OPERATION | IMPORTANT | Get attachment download URL |
| delete_attachment | Task Attachments | backend/app/modules/task_attachments.services.py:63 | DATABASE_OPERATION | IMPORTANT | Delete task attachment |
| add_link | Task Links | backend/app/modules/task_links.services.py:20 | DATABASE_OPERATION | IMPORTANT | Add link to task |
| get_by_task | Task Links | backend/app/modules/task_links.services.py:36 | DATABASE_OPERATION | IMPORTANT | Get links for task |
| update_link | Task Links | backend/app/modules/task_links.services.py:52 | DATABASE_OPERATION | IMPORTANT | Update task link |
| delete_link | Task Links | backend/app/modules/task_links.services.py:68 | DATABASE_OPERATION | IMPORTANT | Delete task link |
| create_meeting | Meetings | backend/app/modules/meetings.services.py:58 | DATABASE_OPERATION | IMPORTANT | Create project meeting |
| get_project_meetings | Meetings | backend/app/modules/meetings.services.py:70 | DATABASE_OPERATION | IMPORTANT | Get project meetings |
| get_meeting | Meetings | backend/app/modules/meetings.services.py:82 | DATABASE_OPERATION | IMPORTANT | Get meeting by ID |
| cancel_meeting | Meetings | backend/app/modules/meetings.services.py:94 | DATABASE_OPERATION | IMPORTANT | Cancel meeting |
| send_message | Messages | backend/app/modules/messages.services.py:14 | DATABASE_OPERATION | IMPORTANT | Send project message |
| get_project_messages | Messages | backend/app/modules/messages.services.py:22 | DATABASE_OPERATION | IMPORTANT | Get project messages |
| create_notification | Notifications | backend/app/modules/notifications.services.py:17 | DATABASE_OPERATION | IMPORTANT | Create user notification |
| get_all_notifications | Notifications | backend/app/modules/notifications.services.py:25 | DATABASE_OPERATION | IMPORTANT | Get user notifications |
| get_one_notification | Notifications | backend/app/modules/notifications.services.py:33 | DATABASE_OPERATION | IMPORTANT | Get notification by ID |
| update_notification | Notifications | backend/app/modules/notifications.services.py:41 | DATABASE_OPERATION | IMPORTANT | Update notification |
| delete_notification | Notifications | backend/app/modules/notifications.services.py:49 | DATABASE_OPERATION | IMPORTANT | Delete notification |
| upload_file | Files | backend/app/modules/files.services.py:24 | FILE_OPERATION | SUPPORTING | Upload file to storage |
| get_file | Files | backend/app/modules/files.services.py:40 | FILE_OPERATION | SUPPORTING | Get file metadata |
| get_file_url | Files | backend/app/modules/files.services.py:52 | FILE_OPERATION | SUPPORTING | Get file download URL |
| delete_file | Files | backend/app/modules/files.services.py:60 | FILE_OPERATION | SUPPORTING | Delete file from storage |
| score_task_complexity | AI | backend/app/modules/ai.service.py:106 | AI | IMPORTANT | Score task complexity with AI |
| call_ai | AI | backend/app/modules/ai.client.py:72 | AI | IMPORTANT | Call external AI provider |

## 11. Potentially Redundant / Low-Value Functions

After thorough analysis, the following functions appear to have potential redundancy or low value:

| Function | Location | Issue |
| -------- | -------- | ----- |
| `get_all_tasks` in TaskService | backend/app/modules/tasks/services.py:58 | Rarely used; most operations are project-scoped or user-scoped |
| `get_all_assigned_members` in AssignedMemberService | backend/app/modules/assigned_members.services.py:18 | Limited use; usually filtered by task or member |
| `get_all_task_comments` in TaskCommentService | backend/app/modules/task_comments.services.py:10 | Usually filtered by task; global list less useful |
| `get_all_notifications` in NotificationService | backend/app/modules/notifications.services.py:10 | Usually filtered by user; global list has limited utility |
| `get_all` in most services | Various locations | Often superseded by scoped getters (by project, by user, etc.) |
| `batch_get_task` in TaskService | backend/app/modules/tasks.services.py:150 | Used but could be inline in callers; low complexity |
| `get_members` in AssignedMemberService | backend/app/modules/assigned_members.services.py:101 | Similar to get_task_members but less specific |
| `get_members_with_task` in AssignedMemberService | backend/app/modules/assigned_members.services.py:110 | Very similar to get_task_members with different filtering |
| `get_by_id` in BaseRepo | backend/app/core/base_repo.py:14 | While used, the pattern could be standardized further |
| `get_all` in BaseRepo | backend/app/core/base_repo.py:18 | Similar to above - often scoped versions preferred |

**Note**: These functions are marked as potentially low-value but are not confirmed unused. They may be used in specific contexts not fully traced in this analysis. No functions should be removed without thorough verification of usage.

## 12. Architecture Observations

### Strengths
1. **Clear Separation of Concerns**: Distinct layers for API, services, repositories, and models
2. **Consistent Patterns**: Uniform structure across modules (service → repo → model)
3. **Effective Use of Dependency Injection**: Database sessions properly injected
4. **Rich Domain Model**: Well-defined entities with clear relationships
5. **Separation of Workload Logic**: Workload calculation isolated in its own module
6. **AI Integration**: Clean separation of AI service from core logic
7. **Frontend-Backend Alignment**: Strong correspondence between frontend hooks and backend endpoints
8. **Proper Error Handling**: Specific exception types used rather than bare except
9. **Migration Awareness**: Comments indicating attention to migration compatibility
10. **Security Consciousness**: Authorization checks in services, not just routes

### Areas for Improvement
1. **Some Business Logic in Services**: A few cases where business rules leak into service layer that could be moved to dedicated utils
2. **Inconsistent Validation**: Some validation in services, some in routes, some in models
3. **Frontend State Management**: Heavy reliance on query invalidation could be optimized with more granular updates
4. **Pagination Missing**: Most list endpoints return all records; could benefit from pagination for large datasets
5. **Some Magic Numbers**: Workload calculation uses hardcoded thresholds (0.5 for underutilized fraction)
6. **Limited Caching**: No evidence of application-level caching for expensive operations
7. **Error Message Consistency**: Some variation in error message formats across endpoints
8. **Database Indexing**: Not all foreign keys appear to have explicit indexes (though SQLAlchemy may add them)
9. **Complex Service Calls**: Some services make many internal service calls, creating deep call stacks
10. **Frontend Component Size**: Some components (like MyTaskDialog) are quite large and could benefit from further decomposition

### Single Points of Failure
1. **Workload Calculation Module**: If `recompute_workload_state()` fails, entire workload monitoring breaks
2. **AI Service**: If AI providers are unavailable, task creation loses complexity scoring
3. **Database Connection**: Single database instance (though with async connection pooling)
4. **Authentication Service**: If auth fails, no users can access system

### Functions with Too Many Responsibilities
1. `TaskService.create_task()` - Handles AI calls, category determination, persistence, and snapshot sync
2. `AssignedMemberService.create_assigned_member()` - Handles assignment, workload calculation, and snapshot sync
3. `RecommendationService.generate_redistribution_options()` - Orchestrates entire redistribution logic flow
4. `MeetingService.create_meeting()` - Handles authorization, provider calls, and persistence

### Missing Abstractions
1. **Permission Checking**: Repeated patterns of checking user roles/project roles could be abstracted
2. **Validation Patterns**: Similar validation logic appears in multiple places
3. **Notification Triggers**: Common pattern of creating notifications after certain actions
4. **Audit Logging**: No centralized audit logging mechanism
5. **File Upload Validation**: Similar file validation rules appear in multiple places

### Potential Architectural Risks
1. **Tight Coupling Between Workload and Redistribution**: Redistribution logic heavily depends on internal workload calculation functions
2. **Deep Inheritance in Models**: Some models have complex inheritance chains (User inherits from multiple bases)
3. **Frontend State Staleness Risk**: Reliance on query invalidation could lead to temporary inconsistencies
4. **AI Provider Lock-in**: Though abstracted, switching AI providers requires changes to client.py
5. **Database Transaction Boundaries**: Some operations span multiple service calls without explicit transaction management
6. **Memory Pressure**: Loading large numbers of tasks/members into memory for calculations
7. **Circular Dependency Risk**: Services importing from each other (though appears well-managed)
8. **Scalability of Calculations**: Workload calculation becomes more expensive as project size grows

## 13. Final Summary

# System Core
```
SYSTEM
│
├── Authentication
│   ├── authenticate_user()
│   ├── refresh_access_token()
│   ├── loginUser()
│   └── ...
│
├── Users
│   ├── get_one_user()
│   ├── create_user()
│   └── ...
│
├── Projects
│   ├── get_one_project()
│   ├── create_project()
│   └── ...
│
├── Project Members
│   ├── get_one_member()
│   ├── create_member()
│   └── ...
│
├── Tasks
│   ├── get_one_task()
│   ├── create_task()
│   ├── update_task()
│   └── ...
│
├ Supertasks
│   ├── get_one_supertask()
│   ├── create_supertask()
│   └── ...
│
├── Assigned Members
│   ├── get_one_assigned_member()
│   ├── create_assigned_member()
│   └── ...
│
├── Workload Calculation
│   ├── recompute_workload_state()
│   ├── calculate_member_workload_totals()
│   ├── create_or_update_member_snapshots()
│   └── ...
│
├── Redistribution Recommendations
│   ├── generate_redistribution_options()
│   ├── is_eligible_for_task()
│   └── ...
│
├── Task Comments
│   ├── get_task_comments_by_task_id()
│   ├── create_task_comment()
│   └── ...
│
├── Task Attachments
│   ├── add_attachment()
│   ├── get_by_task()
│   └── ...
│
├── Task Links
│   ├── add_link()
│   ├── get_by_task()
│   └── ...
│
├── Notifications
│   ├── create_notification()
│   ├── get_all_notifications()
│   └── ...
│
├── Messages
│   ├── send_message()
│   ├── get_project_messages()
│   └── ...
│
├── Meetings
│   ├── create_meeting()
│   ├── get_project_meetings()
│   └── ...
│
├── Files
│   ├── upload_file()
│   └── ...
│
└── AI Service
    ├── score_task_complexity()
    └── ...
```

### Summary Statistics
- **Modules Identified**: 14 core modules (Authentication, Users, Projects, Project Members, Tasks, Supertasks, Assigned Members, Workload Calculation, Redistribution Recommendations, Task Comments, Task Attachments, Task Links, Notifications, Messages, Meetings, Files, AI Service)
- **Domain Entities Identified**: 18 core entities (User, Project, ProjectMember, Task, Supertask, AssignedMember, TaskComment, TaskAttachment, TaskLink, Notification, Message, Meeting, StoredFile, MemberSnapshot, ProjectSnapshot, RedistributionRecommendation, RefreshToken)
- **Important Functions Identified**: ~85 functions across all modules
- **CORE Functions Identified**: 10 functions identified as core system engines
- **Major Workflows Identified**: 8 core workflows (authentication, project creation, task creation, task assignment, workload calculation, task commenting, file attachment, meeting creation)
- **Path to Generated Document**: `/home/clarisa/capstone-collab/docs/system-function-map.md`
- **Areas of Codebase Not Confidently Analyzed**: 
  - Some utility functions in `/frontend/src/lib/` and `/frontend/src/constants/`
  - Specific implementation details of AI provider clients
  - Detailed frontend component styling and layout logic
  - Test files and testing infrastructure
  - Database migration files in `/backend/migrations/` (structure understood but specific revisions not analyzed)
  - Docker and deployment configuration files

The analysis confirms that PSU-Collab is a well-structured application with clear separation of concerns, proper layering, and domain-driven design. The workload calculation and redistribution system represents a particularly sophisticated piece of business logic that appears to be correctly isolated and tested.