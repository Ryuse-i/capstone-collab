# Website Guide Plan

## 1. Summary

PSU-Collab is a role-based capstone workspace whose core value is coordinating projects, task delivery, team workload, and reviews; it is not just a settings site. The highest-value onboarding is a role-aware project setup and task workflow, with extra care around member invitations, task assignment, submission decisions, and administrator account actions. The code includes a first-use “Get Started” screen, but its checklist does not record completion, while several public landing-page links do not lead to implemented destinations. Ratings below are reasoned estimates from the interface and workflows; there is no usage analytics or user research in the repository to confirm frequency.

## 2. Scan coverage

- Enumerated the frontend application source under `frontend/src` (pages, routes, layouts, components, hooks, services, and types), then inspected the main public, student, instructor/advisor, and admin pages and their user-facing forms.
- Enumerated backend application and test Python files under `backend/app` and `backend/test`; checked API router registration and route declarations across the feature modules, including auth, authorization, project/task operations, invitations, workload, papers, meetings, notifications, and admin endpoints.
- Read the existing project overview and authentication documentation (`README.md`, `docs/authentication.md`, `docs/system-function-map.md`, `docs/INSTRUCTOR_DASHBOARD_IMPLEMENTATION.md`, and `ADMIN_DASHBOARD_IMPLEMENTATION_PLAN.md`) as supporting context. They are primarily developer/system documentation, not a user help center.
- Excluded dependency/build/lock/cache files and generated or environment-specific artifacts. I did not inspect `.env` values or the binary model files. I did not audit every migration, test, or low-level helper line by line; the inventory is limited to evidenced user-facing flows and related routes.
- The UI shows Zoom and Google Meet meeting-link support and AI-assisted task complexity analysis. I found no user-facing payment flow, outbound email setup, or scheduled/background-job interface. Some backend endpoints/modules (for example peer evaluations and lower-level task tags/relations) were not clearly exposed by a current frontend page, so they are not presented as usable website features here.
- Audience labels in the table reflect the frontend route/navigation and component conditions. “Leader” refers to a project role; an administrator is a separate platform role. Where a backend endpoint exists but its practical UI permission is not clear from the inspected view, the guide should not promise broader access.

### Rating key

- **Complexity:** Low = one obvious action; Medium = several steps or concepts; High = multi-step decisions or cross-page workflow.
- **Frequency:** Low / Medium / High are estimates of how often a typical user may need the function (rare / occasional / recurring).
- **Importance:** Low / Medium / High estimates contribution to getting value from the product.
- **Risk:** Low / Medium / High estimates the consequence of a mistake (including destructive changes, access, and review decisions).
- **Show vs explain:** Low / Medium / High rates how easy it is to teach visually; High means a short demonstration is especially effective.

## 3. Function inventory

| Function | Audience | File(s) | Complexity | Frequency | Importance | Risk | Show vs explain | Recommended guide | Reason |
|---|---|---|---|---|---|---|---|---|---|
| Explore the product overview and feature carousel | Public visitor | `frontend/src/pages/LandingPage.tsx` | Low | Low | Medium | Low | High | Simplify or hide instead | The carousel is visual and easy to show, but the landing page also contains dead or mismatched destinations; fix those before explaining them. |
| Create an account and sign in | Public visitor | `frontend/src/pages/AuthPage.tsx`; `frontend/src/components/signup-form.tsx`; `frontend/src/components/login-form.tsx`; `backend/app/modules/users/routes.py` | Medium | Low | High | Medium | Medium | Checklist | Signup requires names, email, matching passwords, and a password of at least eight characters; sign-in has specific credential/verification errors. A compact pre-submit checklist prevents avoidable failures. |
| Create a project and invite initial users | Logged-in student starting a project | `frontend/src/pages/student/Dashboard.tsx`; `frontend/src/components/user/GetStartedPage.tsx`; `frontend/src/components/user/CreateProjectDialog.tsx`; `backend/app/modules/projects/routes.py`; `backend/app/modules/project_members/routes.py`; `backend/app/modules/invitations/route.py` | High | Low | High | High | Medium | Interactive tour | The multi-step dialog collects project details and can create invitations for selected instructors/students; users need to understand setup and invitation outcomes before the rest of the workspace is useful. |
| Read the role-specific dashboard and project health | Logged-in student/project team; instructors/advisors have a separate dashboard | `frontend/src/pages/student/Dashboard.tsx`; `frontend/src/pages/student/MemberDashboard.tsx`; `frontend/src/pages/instructor/Dashboard.tsx`; `frontend/src/components/user/ProjectOverview.tsx`; `backend/app/modules/project_health/routes.py`; `backend/app/modules/dashboard/routes.py` | Medium | High | High | Medium | Medium | Interactive tour | Health, workload, schedule, activity, deadlines, and role-specific attention areas are central, but status labels and scores need brief context. |
| Find and manage project tasks in table, board, or timeline views | Project leaders and project staff with task controls; assigned members use their own task list | `frontend/src/pages/student/ProjectTask.tsx`; `frontend/src/components/user/TaskTable.tsx`; `frontend/src/components/user/TaskBoard.tsx`; `frontend/src/components/user/TaskGantt.tsx`; `frontend/src/components/user/AddTaskDialog.tsx`; `frontend/src/components/user/EditTaskDialog.tsx`; `backend/app/modules/tasks/routes.py`; `backend/app/modules/supertasks/routes.py` | High | High | High | High | High | Short video (under 2 min) | The same task plan can be viewed three ways and edited with dates, priorities, assignments, and groupings. A quick visual walkthrough is clearer than a long written explanation; deletion and reassignment deserve caution. |
| Understand AI task-complexity ratings | Project task creators/editors | `frontend/src/components/user/AddTaskDialog.tsx`; `frontend/src/components/user/TaskRationaleDialog.tsx`; `backend/app/modules/tasks/routes.py`; `backend/app/modules/ai/service.py` | Medium | Medium | Medium | Medium | Medium | Tooltip | The form labels the rating as AI-generated and provides a rationale. A nearby tooltip should clarify it is an estimate for workload balancing, not a judgment of a member. |
| Start, update, and submit an assigned task | Assigned project member | `frontend/src/pages/student/MyTask.tsx`; `frontend/src/components/user/MyTaskDialog.tsx`; `backend/app/modules/tasks/routes.py`; `backend/app/modules/task_submissions/routes.py` | Medium | High | High | Medium | High | Checklist | Members move tasks through visible statuses and submit for review. A short in-context checklist can explain what “Submitted” means and where review feedback appears. |
| Review a submission, approve it, or request revisions | Assigned reviewer/project staff | `frontend/src/pages/student/ProjectTask.tsx`; `frontend/src/components/user/SubmissionTable.tsx`; `frontend/src/components/user/ViewSubmissionDrawer.tsx`; `frontend/src/components/user/TaskRevisionNotes.tsx`; `backend/app/modules/task_submissions/routes.py`; `backend/app/modules/revision_notes/routes.py` | High | Medium | High | High | Medium | Written documentation | Approval completes a task; sending it back creates a revision note and returns it to in-progress. Explain the consequences and require actionable feedback rather than relying on a quick visual tour. |
| Discuss task work and share task files or links | Project members and reviewers | `frontend/src/components/user/TaskComments.tsx`; `frontend/src/components/user/TaskAttachments.tsx`; `frontend/src/components/user/TaskLinks.tsx`; `frontend/src/components/user/MyTaskDialog.tsx`; `frontend/src/components/user/ViewSubmissionDrawer.tsx`; `backend/app/modules/task_comments/routes.py`; `backend/app/modules/task_attachments/routes.py`; `backend/app/modules/task_links/routes.py` | Medium | High | High | Medium | High | Short video (under 2 min) | A single visual example can show where a comment, attachment, or link belongs. The task detail drawers are the natural place for a short demonstration. |
| View teammates, contribution, activity, and member details | Project members; leader-only edits where offered | `frontend/src/pages/student/Team.tsx`; `frontend/src/components/user/TeamMembersPanel.tsx`; `frontend/src/components/user/MemberDetailDrawer.tsx`; `backend/app/modules/project_members/routes.py`; `backend/app/modules/member_activities/routes.py`; `backend/app/modules/member_snapshots/routes.py` | Medium | Medium | High | Medium | Medium | Written documentation | Workload and contribution indicators can be misread without definitions. Distinguish what members can view from leader-only edits to member details/skills. |
| Generate, copy, accept, and revoke project invite links | Project leader; invited user accepts | `frontend/src/components/user/InviteLinkPopover.tsx`; `frontend/src/pages/InvitePage.tsx`; `frontend/src/pages/student/Dashboard.tsx`; `backend/app/modules/invite_links/routes.py`; `backend/app/modules/invitations/route.py` | Medium | Low | High | High | High | Checklist | Link roles control access, links expire, and the token is only shown once. A checklist should make the role, expiry, copy-now, and revoke implications explicit. |
| Read workload balance and generate redistribution suggestions | Project members view; project leaders act on task changes | `frontend/src/pages/student/Workload.tsx`; `frontend/src/components/user/WorkloadBalanceCard.tsx`; `frontend/src/components/user/SplitTaskDialog.tsx`; `backend/app/modules/workload/routes.py`; `backend/app/modules/redistribution_recommendations/routes.py` | High | Medium | High | High | Medium | Written documentation | Overload states and transfer/share/split/reschedule suggestions depend on assignment, skills, complexity, and deadlines. Explain that suggestions are options to review, not automatic changes, and show how to open the related task. |
| Share and maintain project resources | Project members; editing availability may vary by role | `frontend/src/pages/shared/Resources.tsx`; `frontend/src/components/user/ProjectResourcesPanel.tsx`; `frontend/src/components/user/AddResourceDialog.tsx`; `frontend/src/components/user/EditResourceDialog.tsx`; `backend/app/modules/resources/routes.py`; `backend/app/modules/resource_links/routes.py` | Medium | Medium | Medium | Medium | High | Short video (under 2 min) | Adding files, links, or code resources and filtering categories is easy to demonstrate. Explain who can edit/delete before users remove shared material. |
| Search, read, and open papers in the capstone repository | Logged-in users; repository editing is admin-only | `frontend/src/pages/shared/CapstoneRepository.tsx`; `frontend/src/pages/shared/CapstoneView.tsx`; `frontend/src/components/user/UploadPaperDrawer.tsx`; `frontend/src/components/user/EditPaperDrawer.tsx`; `backend/app/modules/papers/routes.py`; `backend/app/modules/papers/admin_router.py` | Medium | Medium | High | Medium | High | Short video (under 2 min) | Semantic search results show matching passages and scores; the detail page opens a paper file. Admin-only upload/edit/delete should be clearly separated from ordinary search. |
| Send project messages and schedule a meeting link | Project members; meeting management is limited to project leadership/staff | `frontend/src/pages/shared/Chat.tsx`; `frontend/src/components/meetings/MeetingDialog.tsx`; `frontend/src/hooks/useMessage.ts`; `frontend/src/hooks/useMeeting.ts`; `backend/app/modules/messages/routes.py`; `backend/app/modules/meetings/routes.py`; `backend/app/modules/meetings/providers/google_meet.py`; `backend/app/modules/meetings/providers/zoom.py` | Medium | Medium | High | Medium | High | Tooltip | Messages are recurring while meetings are occasional. Chat is direct and visual; meeting setup requires creating the meeting with Google Meet or Zoom separately, then pasting a provider-specific HTTPS URL. Explain that external step inline. |
| Read, open, and clear notifications | Logged-in user | `frontend/src/components/notifications/NotificationCenter.tsx`; `frontend/src/components/notifications/NotificationDialogContent.tsx`; `backend/app/modules/notifications/routes.py` | Low | High | Medium | Low | High | Tooltip | The bell, unread marker, detail view, and Clear action are visible. Note that Clear only dismisses an item from the current UI session in the inspected component; it is not presented as a persistent delete. |
| Update account details and choose appearance | Logged-in user | `frontend/src/pages/shared/Settings.tsx`; `frontend/src/components/settings/ProfileSettings.tsx`; `frontend/src/components/settings/AppearanceSettings.tsx`; `frontend/src/components/nav-user.tsx`; `backend/app/modules/users/routes.py` | Low | Low | Medium | Medium | High | Tooltip | Name, read-only email, theme choice, and logout are straightforward. Label the email limitation and avoid a standalone tutorial. |
| Update project name and description in Settings | Project leader | `frontend/src/pages/shared/Settings.tsx`; `frontend/src/components/settings/ProjectSettings.tsx`; `backend/app/modules/projects/routes.py` | Low | Low | Medium | Medium | High | Checklist | The screen gates this tab to project leaders and offers Save changes/Reset. A small inline checklist is enough; correct the Settings intro that currently promises email preferences. |
| Inspect assigned projects, deadlines, health, and recent activity | Instructor/advisor | `frontend/src/pages/instructor/Dashboard.tsx`; `frontend/src/pages/instructor/ProjectList.tsx`; `frontend/src/pages/instructor/ProjectView.tsx`; `frontend/src/components/user/ProjectOverview.tsx`; `backend/app/modules/dashboard/routes.py`; `backend/app/modules/projects/routes.py` | Medium | High | High | Medium | Medium | Interactive tour | Staff use several summaries and project drill-downs to decide what needs attention. Highlight the dashboard-to-project path and explain that health indicators are signals to investigate. |
| View system metrics and recent platform activity | Administrator | `frontend/src/pages/admin/Overview.tsx`; `frontend/src/hooks/useAdminMetrics.ts`; `backend/app/modules/admin/routes.py`; `backend/app/modules/admin/metrics_service.py` | Medium | Medium | High | Medium | Medium | Written documentation | The overview covers accounts, files/storage, health, and recorded activity. Definitions and data limitations belong in a short admin reference rather than a first-use popup. |
| Create and manage platform accounts | Administrator | `frontend/src/pages/admin/User.tsx`; `frontend/src/hooks/useAdminUsers.ts`; `backend/app/modules/admin/routes.py`; `backend/app/modules/admin/services.py` | High | Low | High | High | Medium | Written documentation | Creating accounts, editing roles, resetting passwords, deactivating/reactivating, and soft-deleting users affect access and need explicit safeguards and recovery guidance. |
| Log out | Logged-in user | `frontend/src/components/nav-user.tsx`; `frontend/src/hooks/useAuth.ts`; `backend/app/modules/users/routes.py` | Low | Low | Medium | Low | High | Tooltip | Logout is a single action in the user menu; a label/tooltip is sufficient. |

## 4. First-visit tour

Make the tour conditional. A new student with no project should see setup; an invited member should skip project creation and start with their assigned work. A project leader should see invitation and task-management steps. Highlight:

1. **Dashboard / Get Started card** — point to **Create a project** and the project details step; explain that project setup is required before project-specific work appears.
2. **Project creation dialog / Add Members step** — highlight the optional Instructor and Members email searches; explain that matching registered users are invited with the role corresponding to the field.
3. **Project dashboard / Invite link button** — show role selection, Generate link, and Copy link. Call out the displayed seven-day expiry and that the link can be used by anyone who receives it.
4. **Project Task / Add Task and view selector** — show how to create/assign work, then switch between Table, Timeline, and Board.
5. **My Tasks / Open task and submission action** — show how an assigned member starts and submits work, then where a reviewer sees the submission. Do not imply that the submission notes/link fields currently persist; see “Simplify or hide.”

For existing project members, replace steps 1–3 with **My Tasks** and the task detail drawer. Keep the tour skippable and repeatable from help.

## 5. Rollout plan

1. **First — Fix misleading or incomplete onboarding affordances.** Repair the public landing-page destinations and the Settings introduction; then make the Get Started checklist track real actions or remove its progress presentation. Do not add a guide for broken or non-persistent behavior.
2. **Second — Build a role-aware project setup checklist/tour.** Prioritize no-project students and project leaders, with a separate invited-member entry path. Include a clear invite-link safety step and a task-to-submission walkthrough.
3. **Third — Add focused references and validate.** Publish short guides for submission review/revisions, workload recommendations, admin account safeguards, and instructor health metrics. Test with students, leaders, instructors/advisors, and an administrator; replace frequency estimates with observed usage and confusion points.

## 6. Simplify or hide

- **Fix the landing CTA and placeholder destinations instead of documenting them.** `LandingPage.tsx` links one “Get started free” CTA to `/register`, while the app defines `/signup`; the Pricing link points to `#pricing` with no matching section, and several footer destinations are `#`. Point working CTAs to the implemented signup route and remove or implement the empty destinations.
- **Replace the inert setup progress UI.** `GetStartedPage.tsx` initializes `completedSteps` to an empty list and does not update it; its listed “Invite team members” and “Set up your first board” steps are not interactive checklist items. Either instrument real completion/actions or display a simple static “Getting started” sequence without false progress.
- **Do not teach Settings email preferences as a feature.** `Settings.tsx` describes “e-mail preferences,” but the visible settings provide profile, appearance, and leader-only project settings. Change that copy; the profile email field is disabled/read-only.
- **Do not present submission notes/link as saved yet.** `MyTaskDialog.tsx` contains submission notes and link inputs but explicitly does not send them in the task update. Remove/disable those fields until the backend accepts and persists them, or implement that behavior before producing instructions.
- **Remove or defer the unused peer-evaluation guide.** The backend has peer-evaluation endpoints, but no current user-facing frontend flow was found in the scanned pages/components. Add onboarding only if a real UI is introduced.
- **Keep routine theme, notification, and logout actions self-explanatory.** They do not justify a full tutorial; use concise labels and tooltips only where a user may otherwise misinterpret an action.

## 7. Draft content

**Top-priority guide:** role-aware “Set up your project” checklist, shown in the Get Started area to a student who has no current project. This is proposed copy; it does not claim the existing checklist currently tracks completion.

**Title:** Set up your project

**Intro:** “Create a project, bring in the right people, and add your first task. You can change project details later.”

1. **Highlight: Create a project button / `Create your new project` dialog.**

   “Enter a project name and description. Both fields are required to create the project.”
2. **Highlight: `Add Members` step.**

   “Optionally search for a registered instructor and/or students by email. The field you use sets the invitation role. You can skip this and invite people later.”
3. **Highlight: `Submit` button.**

   “Review your project details and invitees, then select **Submit** to create the project and invitations.”
4. **Highlight: Dashboard `Invite link` control.**

   “Choose the role before generating a link. Anyone who receives the link can use it to join with that role. Links expire after seven days; copy a new link now because the token cannot be shown again later.”
5. **Highlight: Project Task `ADD TASK` button.**

   “Add a task with a clear name, description, priority, deadline, and assignee. Use Table, Timeline, or Board to view the same project work in different ways.”
6. **Highlight: My Tasks card and `Open` button (for assigned members).**

   “Open a task to review its details and update its status. When your work is ready, submit it for review. A reviewer can approve it or send it back with revision feedback.”

**Alternate entry for an already-invited member:**

“You’ve joined a project. Open **My Tasks** to see work assigned to you, or open **Team** to see your project members.”

Do not state that task submission notes or links are saved until the corresponding inputs are connected to persistent backend fields.

## 8. Assumptions and questions for me

- Frequency and risk scores are hypotheses from the visible workflows, not measured analytics; confirm them with real user sessions before investing in video production.
- The project setup flow can add selected users and the dashboard exposes invitation links, but the intended canonical invitation process (email invitation versus shareable link) is not explained by the user-facing documentation.
- A generated invite link is shown as valid for seven days and “Anyone with the link can join”; confirm whether that policy and wording are intended for all three selectable roles.
- The UI includes Zoom/Google Meet link handling, but meeting creation itself happens on the provider site. Confirm whether users should be given a direct institutional meeting-creation guide or whether pasted links are the intended integration boundary.
- Confirm which student project roles should see task creation, review, member editing, and redistribution actions; the user-facing controls and backend authorization are not uniformly discoverable from navigation alone.
- Confirm whether the public landing-page claims (including contribution metrics and AI-assisted review) should be treated as currently available product promises or simplified to match verified live flows.
