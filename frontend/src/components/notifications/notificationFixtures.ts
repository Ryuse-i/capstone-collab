import type { NotificationResponse } from "@/types/notification";

export function getMockNotifications(userId?: string): NotificationResponse[] {
  const now = Date.now();
  const timestamp = (minutesAgo: number) =>
    new Date(now - minutesAgo * 60 * 1000).toISOString();
  const owner = userId ?? "mock-user";

  return [
    // ---- Warning (amber icon) ----
    {
      id: "mock-notification-project-health-alert",
      user_id: owner,
      title: "Project Health Alert",
      body: "Your project is behind schedule and its overall health needs attention. Review task progress and workload distribution.",
      is_read: false,
      type: "general",
      invitation_id: "",
      created_at: timestamp(8),
      updated_at: timestamp(8),
    },
    {
      id: "mock-notification-deadline-warning",
      user_id: owner,
      title: "Deadline approaching",
      body: "Warning: the capstone defense milestone is due in 2 days and 3 tasks are still open.",
      is_read: false,
      type: "general",
      invitation_id: "",
      created_at: timestamp(12),
      updated_at: timestamp(12),
    },
    {
      id: "mock-notification-unassigned-tasks",
      user_id: owner,
      title: "5 Tasks Unassigned in Project Task",
      body: "Five tasks have no assigned member and need attention before the next project checkpoint.",
      is_read: false,
      type: "general",
      invitation_id: "",
      created_at: timestamp(16),
      updated_at: timestamp(16),
    },

    // ---- Overdue / missed (red warning icon) ----
    {
      id: "mock-notification-overdue-tasks",
      user_id: owner,
      title: "4 tasks are overdue",
      body: "Overdue tasks in the Frontend board need attention. Update their status or move the due dates.",
      is_read: false,
      type: "general",
      invitation_id: "",
      created_at: timestamp(22),
      updated_at: timestamp(22),
    },
    {
      id: "mock-notification-missed-deadline",
      user_id: owner,
      title: "Missed deadline",
      body: "The wireframe review task passed its due date yesterday. Update its status or reschedule it.",
      is_read: false,
      type: "general",
      invitation_id: "",
      created_at: timestamp(26),
      updated_at: timestamp(26),
    },

    // ---- Task completed (green circled check) ----
    {
      id: "mock-notification-task-completed",
      user_id: owner,
      title: "Task completed",
      body: "Mia Santos completed the user research summary in Project Task.",
      is_read: false,
      type: "general",
      invitation_id: "",
      created_at: timestamp(29),
      updated_at: timestamp(29),
    },
    {
      id: "mock-notification-sprint-completed",
      user_id: owner,
      title: "Sprint 3 finished",
      body: "All planned items in Sprint 3 were completed ahead of schedule. Nice work, team!",
      is_read: true,
      type: "general",
      invitation_id: "",
      created_at: timestamp(35),
      updated_at: timestamp(35),
    },

    // ---- Context updated (blue, no icon) ----
    {
      id: "mock-notification-context-updated",
      user_id: owner,
      title: "Context updated",
      body: "The project brief was updated from Google Drive and is ready for review.",
      is_read: false,
      type: "general",
      invitation_id: "",
      created_at: timestamp(43),
      updated_at: timestamp(43),
    },
    {
      id: "mock-notification-meeting-starting",
      user_id: owner,
      title: "Team meeting starting soon",
      body: "Your Google Meet project sync starts in 30 minutes. Three teammates have joined the agenda.",
      is_read: false,
      type: "general",
      invitation_id: "",
      created_at: timestamp(57),
      updated_at: timestamp(57),
    },

    // ---- Project invitation (amber glow, no icon) ----
    {
      id: "mock-notification-project-invitation",
      user_id: owner,
      title: "Project invitation",
      body: "Alex Reyes invited you to join the PSU Capstone Team as a frontend developer.",
      is_read: false,
      type: "project_invitation",
      invitation_id: "mock-invitation-1",
      created_at: timestamp(65),
      updated_at: timestamp(65),
    },

    {
      id: "mock-notification-comment-mentioned",
      user_id: owner,
      title: "You were mentioned in a task comment",
      body: "Carlos mentioned you in the API integration task and asked for feedback on the latest changes.",
      is_read: true,
      type: "general",
      invitation_id: "",
      created_at: timestamp(74),
      updated_at: timestamp(74),
    },

    // ---- Warning (read) ----
    {
      id: "mock-notification-inactive-member",
      user_id: owner,
      title: "Teammate inactive",
      body: "Jordan has had no activity for 7 days. Consider checking in, as their tasks may need attention.",
      is_read: true,
      type: "general",
      invitation_id: "",
      created_at: timestamp(88),
      updated_at: timestamp(88),
    },

    {
      id: "mock-notification-workload-recommendation",
      user_id: owner,
      title: "Workload redistribution recommended",
      body: "Project Task detected an uneven workload. Review the recommended assignments before the deadline.",
      is_read: true,
      type: "general",
      invitation_id: "",
      created_at: timestamp(96),
      updated_at: timestamp(96),
    },

    // ---- Error (red glow, no icon) ----
    {
      id: "mock-notification-sync-failed",
      user_id: owner,
      title: "Calendar sync failed",
      body: "The latest Microsoft Outlook calendar sync failed. Try again or reconnect the integration.",
      is_read: false,
      type: "general",
      invitation_id: "",
      created_at: timestamp(121),
      updated_at: timestamp(121),
    },
    {
      id: "mock-notification-upload-failed",
      user_id: owner,
      title: "File upload failed",
      body: "design-spec.pdf could not be uploaded to the Documents tab. Check your connection and try again.",
      is_read: false,
      type: "general",
      invitation_id: "",
      created_at: timestamp(140),
      updated_at: timestamp(140),
    },
    {
      id: "mock-notification-report-error",
      user_id: owner,
      title: "Report generation error",
      body: "An error occurred while generating the weekly progress report. Please retry in a few minutes.",
      is_read: true,
      type: "general",
      invitation_id: "",
      created_at: timestamp(180),
      updated_at: timestamp(180),
    },

    // ---- Success (green circled check) ----
    {
      id: "mock-notification-integration-connected",
      user_id: owner,
      title: "Google Drive connected",
      body: "Your Google Drive integration was connected successfully. Project files will now sync automatically.",
      is_read: true,
      type: "general",
      invitation_id: "",
      created_at: timestamp(240),
      updated_at: timestamp(240),
    },
  ];
}