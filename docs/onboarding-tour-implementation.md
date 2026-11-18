# PSU-Collab Onboarding Guide

## Overview

The onboarding guide is a frontend-only, Driver.js walkthrough that follows the user's role and moves between the relevant pages. It supports three student states—no project, project leader, and project member—and instructors. Administrators do not receive an automatic tour or a replay option. The tour explains controls and navigation but never clicks, submits, creates, or accepts anything for the user.

The backend platform roles are student, instructor, and admin; advisor is a project-member role, not a separate platform role. Instructors who advise projects use the instructor walkthrough.

## Tours by role

| Variant | Pages and topics |
|---|---|
| `student-no-project` | Dashboard welcome, Create project, and Join with invite link actions; stops before opening either dialog. |
| `student-leader` | Dashboard health and invitation link; Project Task views and task list; My Tasks filters and cards; Workload summary and recommendations; Team; Chat; Resources; Capstone Repository. |
| `student-member` | Dashboard summary; My Tasks filters and cards; Team; Chat; Resources; Capstone Repository. Members are not guided through Project Task or Workload because those areas are not in the member sidebar. |
| `instructor` | Dashboard summary; Projects; Chat project context and composer; Capstone Repository. |

Each tour begins with a centered welcome popover. Other steps use stable `data-tour` attributes rather than visual classes or displayed text. Descriptions are kept to one sentence. If a target is missing or hidden, the controller waits briefly and skips it; it does not highlight skeletons or leave an overlay active while waiting.

## Eligibility, entry points, and persistence

- Successful signup marks the new user's ID with `psu-collab:onboarding:v1:<userId>:new-user` in [`signup-form.tsx`](../frontend/src/components/signup-form.tsx). Only flagged users receive automatic tours; existing users are not flagged retroactively.
- Completion and skipping are saved separately by user and variant using `psu-collab:onboarding:v1:<userId>:<tourId>`. Step progress stays in memory and is not resumed after a reload.
- Storage helpers in [`onboarding.ts`](../frontend/src/lib/onboarding.ts) fall back to in-memory state when localStorage is unavailable. No names, emails, tokens, or project details are stored.
- Automatic start waits for the role-specific dashboard to finish loading. The no-project tour is offered from the setup/dashboard flow; after project creation and membership refresh, a flagged user can receive the distinct leader or member tour.
- **Replay onboarding guide** appears in the account menu for students and instructors, flagged or not. It selects the user's current tour variant and returns to `/dashboard` before starting. Admins have no replay item.

## Implementation

[`OnboardingTourProvider.tsx`](../frontend/src/components/onboarding/OnboardingTourProvider.tsx) owns the tour definitions, Driver.js lifecycle, page transitions, target wait/skip handling, and completion state. [`OnboardingTourContext.ts`](../frontend/src/components/onboarding/OnboardingTourContext.ts) and [`useOnboardingTour.ts`](../frontend/src/hooks/useOnboardingTour.ts) expose the controller. [`useAutoStartOnboardingTour.ts`](../frontend/src/hooks/useAutoStartOnboardingTour.ts) gates automatic starts by signup eligibility, tour variant, and page readiness. The provider is mounted around the app routes in [`App.tsx`](../frontend/src/App.tsx).

Tour targets are placed in the relevant dashboard, task, workload, team, chat, resources, repository, and instructor project pages. [`nav-user.tsx`](../frontend/src/components/nav-user.tsx) provides replay. The visual overrides are centralized in [`onboarding-tour.css`](../frontend/src/styles/onboarding-tour.css), using the app's theme tokens, responsive popover sizing, focus styling, and reduced-motion handling.

The setup screen in [`GetStartedPage.tsx`](../frontend/src/components/user/GetStartedPage.tsx) uses a welcome card with Create project, Join with invite link, and Take a quick tour actions. The student no-project tour explains both choices and highlights each action without opening either dialog. The project dialog remains outside the tour because it traps focus; it supplies its own short step helper text in [`CreateProjectDialog.tsx`](../frontend/src/components/user/CreateProjectDialog.tsx). Membership loading, confirmed no-membership, and request errors are handled separately in [`RoleBasedDashboard.tsx`](../frontend/src/components/RoleBasedDashboard.tsx), and project/membership refresh behavior is implemented in the existing frontend hooks and dialog.

## Invite links

The app header beside notifications switches between two actions: project leaders/admins with a project get a link for inviting others, while users without a project can join with an invite link. Other project members do not see the invite action, preserving the previous dashboard role gate. The setup card also offers the join action. Pasting a link accepts it and returns the user to the dashboard; opening a shared `/invite/:token` link auto-accepts for an authenticated user and then redirects to the dashboard. Logged-out recipients return to the same invite after signing in; new recipients can register first and then sign in to continue. Link acceptance remains separate from project creation.

## Appearance and accessibility

The tour uses a dim overlay, padded rounded spotlight, themed popover and arrow, progress text, Back/Next/Done controls, and a quiet close control labeled for skipping. Popover hover and focus states use theme tokens in both color modes. Keyboard controls and reduced-motion-aware animation are enabled in the Driver.js configuration. Focus is returned to the previously focused page element when the tour ends, when that element is still mounted. Actual screen-reader announcements and device-specific behavior still require manual verification.

## Validation and manual checks

- Targeted ESLint passed for the onboarding provider, user menu, student/instructor dashboards, task filters, team, workload, repository, and resources changes.
- Targeted ESLint also passed for the invite-link UI, auth-return flow, app layout, and invite acceptance hook.
- Targeted ESLint passed for onboarding and project-creation dark-mode changes.
- `npm run build` was attempted from `frontend`; it is blocked by four existing `Skill[]` type errors in `src/components/data-table.tsx` (lines 403, 731, 759, and 785). No onboarding-file type errors were reported.
- `npx vite build` passed after the invite-link and dark-mode changes, with the existing large-chunk warning.
- Full `npm run lint` was attempted; it exits with pre-existing violations in unchanged files, including `chart-area-interactive.tsx`, `NotificationCenter.tsx`, and `reui/stepper.tsx`. The changed Chat and Project Task files also have existing `react-hooks/set-state-in-effect` findings unrelated to the added tour targets.
- `git diff --check` passed.

Manual verification remains useful for signup eligibility, creating a project and receiving the next variant, existing-account replay, instructor replay, skip/replay behavior, route transitions, dark mode, keyboard and screen-reader behavior, and narrow screens. Invite-link checks should cover the header action with and without a project, pasted-link acceptance, direct-link auto-accept, and a logged-out recipient returning through sign-in or registration to the dashboard.
