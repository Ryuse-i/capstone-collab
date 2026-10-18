// types/dashboard.ts  ->  src/types/dashboard.ts
// Mirrors app/modules/dashboard/schema.py (snake_case, same as the rest of the API).

export type DashboardRole = "instructor" | "advisor";
export type DashboardHealth = "healthy" | "watch" | "at_risk";
export type DashboardUrgency = "overdue" | "today" | "soon" | "later";

export interface DashboardProject {
  id: string;
  name: string;
  role: DashboardRole;
  health: DashboardHealth | null; // null = could not be calculated
  health_score: number | null;
  progress: number; // 0-100
  pending_submissions: number;
}

export interface DashboardDeadline {
  id: string; // task id
  project_id: string;
  project_name: string;
  role: DashboardRole;
  title: string;
  student_names: string[];
  note: string | null;
  deadline: string; // "YYYY-MM-DD"
  days_from_now: number; // negative = overdue
  urgency: DashboardUrgency;
}

export interface DashboardStats {
  total_projects: number;
  at_risk_projects: number;
  pending_submissions: number;
  overdue_deadlines: number;
}

// Placeholder shape until the activity feed is built.
export interface DashboardActivityItem {
  id: string;
  project_id: string;
  project_name: string;
  message: string;
  timestamp: string; // ISO
  type: string;
  actor_name: string;
}

export interface InstructorDashboardResponse {
  projects: DashboardProject[];
  deadlines: DashboardDeadline[];
  stats: DashboardStats;
  recent_activity: DashboardActivityItem[];
}