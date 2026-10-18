export type ActivityType =
  | "task_created"
  | "task_submitted"
  | "task_status_changed"
  | "comment_added"
  | "member_joined"
  | "revision_requested"
  | "submission_accepted";

/** One row from GET /member_activities/projects/{project_id} */
export interface MemberActivityResponse {
  id: number;
  member_id: string; // UUID
  task_id: string | null;
  type: ActivityType | null; // null for old rows
  detail: string;
  created_at: string; // ISO datetime
  actor_name: string | null;
  task_name: string | null;
}

export interface MemberActivityFilters {
  projectId: string;
  limit?: number;
  before?: string; // created_at of the last item you already have
}

/** Shape the member dashboard's Recent Activity card renders */
export interface DashboardActivity {
  id: number;
  user: string;
  action: string;
  task: string;
  time: string;
  color: "bg-green-500" | "bg-yellow-500" | "bg-red-500";
  text: "text-green-500" | "text-yellow-500" | "text-red-500";
}