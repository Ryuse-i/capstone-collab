# PSU-Collab UI Video Guide

This guide explains the pages and UI controls for a normal project member, project leader, and instructor/advisor. It is written for later screen-recorded walkthroughs.

## Shared recording setup

- Start on a clean dashboard and use one project throughout each guide.
- Open the sidebar in expanded mode first, then mention that the icon-only collapsed sidebar shows the same sections.
- The sidebar also keeps a colored dot beside **Chat** when unread project messages are present.
- The bottom of the sidebar contains the signed-in account menu and sign-out action.
- Use light mode for general walkthroughs and briefly show the Appearance settings for dark mode and system mode.
- Health colors used throughout the app:
  - Green: healthy or normal
  - Yellow/amber: watch or needs attention
  - Red: at risk or overloaded

## Settings

**Where:** Sidebar > **Settings**

The Settings page has a small tab row. Its tabs are remembered for the next visit.

### Account

Explain first:
- First name and last name are editable.
- Email is read-only.
- **Save changes** becomes available after changing both required name fields.
- **Reset** restores the name fields to the saved values.

### Appearance

Explain:
- **Light** uses the light dashboard theme.
- **Dark** uses the dark dashboard theme.
- **System** follows the device/browser color preference.
- The preview card shows the selected theme before the user leaves the page.

### Project Settings

This tab appears only for a project leader.
- **Project name** changes the project title.
- **Description** changes the project description.
- **Save changes** and **Reset** behave like the Account form.
- **Danger zone** contains the permanent **Delete project** action.
- Deletion requires confirmation and removes the project, tasks, members, and related data. Explain clearly that this cannot be undone.

## Capstone Repository

**Where:** Sidebar > **Capstone Repository**

The repository is shared across roles.
- The page header identifies it as a repository for existing capstone papers.
- The search field performs meaning-based paper search. It can accept natural-language phrases such as “machine learning for disease prediction.”
- **Latest papers** appears by default.
- **N results found** appears while viewing search results.
- Each paper card can be opened to show the title, keywords, publication year, authors, and abstract.
- Loading, empty, and error states are visible if results cannot be loaded.

An administrator may also see **Add paper** and repository deletion controls. Normal members, leaders, and instructors do not need to demonstrate administrator-only actions.

## Chat

**Where:** Sidebar > **Chat**

Chat is available to students and instructors/advisors.

### Chat header

- The header shows the selected project's name.
- Normal members and leaders see the chat for their current project.
- Instructors and advisors see a project list in a separate left sidebar. Selecting a project changes the active conversation.
- **Schedule meeting** is available only to users who can manage meetings: leaders, advisors, instructors, and admins.

### Meeting banner

Scheduled meetings appear in the message area as green cards.
- The card includes the meeting topic, provider, and start time.
- While the meeting is in progress, the card shows how much time remains until its scheduled end.
- **Join** opens the Google Meet or Zoom link in a new browser tab.
- Once the scheduled end time passes, the card changes to **Meeting ended** and the Join action is no longer available. This is an app-side status; it does not disconnect participants from a provider call already open in another tab.
- Loading and failure states are shown above the messages if meeting data cannot be retrieved.

### Message area

- The user's own messages are aligned to the right in a maroon bubble.
- Other senders appear on the left with an avatar and sender name.
- Each message shows a short time stamp.
- When no messages exist, the page says “No messages yet — say hello.”
- Opening Chat marks the selected project conversation as seen and clears its unread marker.

### Composer

- Enter text in **Type your message**.
- Press Enter or click the send button to send.
- Shift+Enter adds a line break.
- The send button is disabled while the message is empty or while sending.

## Normal member guide

Normal members are students whose project role is **member**. Their dashboard is personal rather than project-management-focused.

### 1. Getting started without a project

If the student is not yet assigned to a project, the Dashboard shows a welcome card instead of project metrics.
- **Create project** starts project setup. The student may then become the project leader.
- **Join with invite link** opens the invitation flow.
- **Guides & tutorials** provides in-app guidance.
- An invite URL takes the user through login if necessary, accepts the invitation, and returns to the dashboard.

### 2. My Dashboard

**Where:** Sidebar > **Dashboard**

Explain the header and **View all my tasks** button first.

The four summary cards are:
- **Total Assigned**: every task assigned to the user.
- **In Progress**: tasks currently being worked on.
- **Completed**: tasks that have reached completed status.
- **Completion**: percentage of assigned tasks completed, plus counts not started and awaiting review.

The dashboard is divided into:

- **Currently Working On**
  - Shows one selected in-progress task.
  - Shows task name and description.
  - Uses an overdue, status, or due-soon indicator where applicable.
  - Opening the task shows the task drawer.
  - If no task is in progress, the card explains the empty state and links to My Tasks.

- **Needs Attention**
  - Highlights overdue tasks, tasks due soon, submitted tasks waiting for review, and work that is not started.
  - Each item can open its task.

- **Project Team Overview**
  - Shows the current team and each member's workload status.
  - Workload statuses are normal, underutilized, or overloaded.
  - It provides a **View Team** link.

### 3. My Tasks

**Where:** Sidebar > **My Task**

This page contains only tasks assigned to the logged-in member.

At the top, the filter pills show:
- All
- Not Started
- In Progress
- Submitted
- Completed

Each pill includes a count and filters the card grid. If no tasks exist in the selected state, the page says “No tasks in this stage yet.”

Each task card shows:
- Task title
- Deadline warning or status
- Short description
- Priority: low, medium, or high
- Due date
- Assigned-member avatars, where the task has collaborators
- **Open** to show the full task drawer

Inside the task drawer:
- **Task name**, description, status, priority, complexity, category, and deadline can be reviewed.
- **Started** is shown after the task has started.
- **Task Attachments** and **Task Links** allow the member to add or open supporting evidence.
- **Comments** are available for project discussion.

The action at the bottom depends on task status:
- Not started: **Start Task**
- In progress:
  - **Submit Task** opens the submission form.
  - **Confirm Submit** submits the work.
  - **Cancel** closes the submission form.
- Submitted: the UI indicates “Waiting for review.”
- Completed: no further submission is needed.

The member can attach files and links before submitting. Those controls save independently of the main task submission.

### 4. Team

**Where:** Sidebar > **Team**

The page heading explains that it monitors workload, capacity, and contribution.
- Member cards show name, role, email, workload status, contribution points, and capacity.
- The **Contribution** card ranks members by points earned after approved submissions.
- Selecting a member opens a detail drawer.
- Normal members can review member details and skills.
- Only the project leader can edit member skills and capacity.

### 5. Resources

**Where:** Sidebar > **Resources**

The Resources page is for shared project links and files.
- Filters include All, Links, Paper Files, and Code.
- Each resource card shows category, title, author, relative date, and file size where applicable.
- **Open** opens the selected resource.
- A member who created a resource can edit it.
- The project leader can edit or delete any project resource.
- **Add Resource** allows a project member to add a link or file.
- The edit dialog can update resource details and delete the resource.

### 6. Shared repository and Chat

Normal members use the shared **Capstone Repository** for reference papers and **Chat** for project communication.

---

## Project leader guide

A project leader is a student with project role **leader**. The leader sees every normal-member page plus project-management pages and controls.

### 1. Leader Dashboard

**Where:** Sidebar > **Dashboard**

The leader dashboard is a project-health and team-performance view.

Explain the health banner first:
- **Project Health On Track**, **Watch**, or **At Risk**
- Overall health score
- Health-level explanation
- Progress percentage
- The banner may cite a performance override, such as overdue tasks or chronically overloaded members.

Project Progress shows:
- Completed task points versus total points
- Remaining points
- Overall completion percentage

Sub-score cards show:
- **Schedule**
- **Workload balance**
- **Risk**
- **Activity**

**What needs attention** lists up to the two weakest areas. It may include overdue work, underused or overloaded balance, unassigned tasks, single-person delivery risk, and stalled tasks. Items link to the relevant page where possible.

The leader dashboard also includes:
- **Member Workload**: highest-workload members and their capacity
- **Task Status Distribution**: counts for not started, in progress, submitted, and completed tasks
- **Recent Activity**: latest team updates
- **See all** under Member Workload to open the Workload page

### 2. Project Task

**Where:** Sidebar > **Project Task**

This is the leader's primary task-management page.

The summary cards show:
- Total tasks
- Not started
- In progress
- Submitted
- Completed

An amber warning appears when tasks are unassigned. It advises the leader to assign those tasks to keep workload balance accurate.

The view controls are:
- **Table**: task, status, priority, assignees, due date, complexity, and edit action
- **Timeline**: Gantt-style scheduling and date view
- **Board**: task cards organized by supertask or status/group structure
- **Submissions**: tasks in submitted state for review

The selected view is remembered for later visits.

**Add Task** opens the task creation flow. A task can include:
- Name and description
- Category and priority
- Complexity
- Deadline and timeline
- Primary and secondary skills
- Assigned members
- Assigned reviewer
- Supertask or task links where applicable

The leader can open a row or card in **Edit Task** to update task details and assignments.

### 3. Submissions

Open it with the **Submissions** button on Project Task or review it as part of the project workflow.
- Status and assigned-member filters narrow the table.
- The table shows task name, category, complexity, assignees, and due date.
- **Open** shows the submission so the leader/reviewer can review attachments and comments.

### 4. Workload

**Where:** Sidebar > **Workload**

**Recalculate** refreshes the current workload snapshot.

The page banner reports:
- Balanced
- Warning/medium imbalance
- Severe/high or critical imbalance
- Current balance percentage

Summary cards show:
- Total workload points
- Average points per member
- Overloaded members
- Underutilized members

**Member Workload** compares actual points with expected points for each member. Red means overloaded, yellow means underutilized, and green means normal.

**Task Complexity Distribution** shows low, medium, and high complexity counts and percentages. A tip may recommend splitting complex work when a meaningful share of tasks is high complexity.

**Redistribution Recommendations** can:
- Generate suggestions
- Rank transfer, share, split, or reschedule recommendations
- Explain why the change is suggested
- Link to the affected task
- Apply a recommendation where the action is supported

### 5. Team management

**Where:** Sidebar > **Team**

The leader can open each member's detail drawer and edit:
- Skills
- Capacity multiplier
- Warning information and member snapshots exposed in the UI

Use this page to explain that workload and distribution depend on accurate member skills and capacity.

### 6. Leader-only project settings

**Where:** Sidebar > **Settings** > **Project Settings**

The leader can rename or describe the project and delete it.

### 7. Leader Resources and Chat

The leader uses Resources to add and manage shared project materials and Chat to communicate with members or schedule project meetings.

---

## Instructor/advisor guide

Instructors and advisors supervise projects and use the portfolio dashboard plus project detail views.

### 1. Instructor Dashboard

**Where:** Sidebar > **Dashboard**

This is a cross-project portfolio view.

The summary strip shows:
- **Active projects** across instructor and advisor assignments
- **Watch or at risk** projects
- **Pending submissions** awaiting feedback
- **Overdue deadlines** for open tasks

**Needs your attention**
- Lists projects sorted by health and pending submissions.
- Shows role, health badge, project name, progress, and pending submission count.
- **Open** opens the project detail page.
- **View all** expands projects beyond the first few cards.

**Upcoming deadlines**
- Shows deadlines with a date tile and urgency label.
- Filters use All, As instructor, and As advisor.
- Each item shows role, task title, project name, assigned student names, notes, and **View project**.
- **View all** expands the complete deadline list.

**Recent Activity**
- Shows who performed an action, the action message, project name, and relative time.
- This gives the instructor a quick cross-project update feed.

### 2. Projects

**Where:** Sidebar > **Projects**

The Projects page displays cards for projects where the user is the instructor or advisor.
- Each card shows the assignment role.
- The card title and description summarize the project.
- **View** opens the detailed project page.
- The sidebar can remember the last visited project and provide recently visited project shortcuts.

### 3. Project detail

**Where:** Projects > **View** or a recent-project sidebar shortcut

The header shows:
- Project name
- Description
- Project health
- Completion percentage

The detail page has five tabs:

#### Overview

The Overview tab summarizes:
- Project health
- Schedule and completion
- Workload
- Risk
- Member workload
- Weak areas that need attention
- Project leader and instructor/advisor names

This tab is read-only in the health summary and is useful for explaining project status before opening detailed tables.

#### Tasks

The Tasks tab combines:
- Points-weighted task progress
- Not started, in progress, submitted, and completed counts
- Timeline insight
- Overdue and at-risk task counts
- Next deadlines
- Full task table

Instructors and advisors can use **Add Task** in this tab for the project, when permitted by the workflow.

Explain:
- A red overdue count needs immediate attention.
- “Remaining points” indicates scope that has not been completed.
- “Next deadlines” uses relative wording such as today or in X days.

#### Submissions

The Submissions tab is for feedback review.
- Status and assignee filters narrow submissions.
- The table shows task name, category, complexity, assigned students, due date, and **Open**.
- Opening a submission lets the reviewer inspect the submitted task and attachments before approval or revision.

#### Members

The Members tab uses the same team panel as the student team page.
- It shows project roles, workload state, capacity, contribution points, and warning indicators.
- It helps the instructor identify overloaded, underutilized, or inactive members.

#### Resources

The Resources tab shows project resources in one of the shared resource categories.
- Instructors can open project links and files.
- Leadership/edit permissions remain separate from the read-and-open view.

### 4. Instructor Chat

**Where:** Sidebar > **Chat**

- Select a project from the left project list.
- Review the project conversation.
- Send messages.
- Schedule meetings for the selected project.
- Open scheduled Google Meet or Zoom meetings.
- The green dot beside Chat indicates unread messages for the currently relevant project.

## Cross-role Common Actions

### Sidebar

- Dashboard routes to the correct role-specific dashboard.
- Settings is available across authenticated roles.
- Capstone Repository is shared across roles.
- Chat is available to students and instructors/advisors.
- Projects or My Task/Project Task navigation changes according to project role.

### Navigation and feedback

- Skeleton cards appear while pages load.
- Red or amber text indicates errors and attention states.
- Toast notifications confirm saves, submissions, resource changes, and invitation actions.
- Confirmation dialogs protect destructive actions such as project deletion.
- Search and selected tabs may be remembered locally by the browser.

### What to demonstrate in the video

For **normal member**:
1. Dashboard
2. My Tasks
3. Start, attach, comment, and submit a task
4. Team
5. Resources
6. Chat

For **project leader**:
1. Leader Dashboard
2. Project Task and task creation
3. Table, timeline, board, and submissions
4. Workload and recalculation
5. Redistribution recommendations
6. Team editing
7. Project settings

For **instructor/advisor**:
1. Instructor Dashboard
2. Projects list
3. Project Overview
4. Tasks and timeline status
5. Submissions
6. Members
7. Resources
8. Chat and meeting scheduling
