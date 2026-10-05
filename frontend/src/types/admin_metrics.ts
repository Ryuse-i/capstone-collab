import type { AdminUserRole } from "@/types/admin_user";

export type AdminTaskStatus =
  | "not_started"
  | "in_progress"
  | "submitted"
  | "completed";

export interface AdminMetricsOverview {
  generated_at: string;
  users: {
    total: number;
    active: number;
    inactive: number;
    verified: number;
    unverified: number;
    new_last_7_days: number;
    new_last_30_days: number;
    active_last_7_days: number;
    active_last_30_days: number;
    unverified_older_than_7_days: number;
    soft_deleted_total: number;
    failed_logins_last_24h: number;
    by_role: Record<AdminUserRole, number>;
  };
  projects: {
    total: number;
    without_instructor: number;
    memberships: number;
    new_last_30_days: number;
  };
  tasks: {
    total: number;
    overdue: number;
    unassigned: number;
    new_last_30_days: number;
    by_status: Record<AdminTaskStatus | "unknown", number>;
  };
  files: {
    total: number;
    total_size_bytes: number;
    new_last_30_days: number;
    by_type: AdminFileTypeMetrics[];
    recent: AdminStoredFileItem[];
  };
  activity: {
    recent: AdminActivityItem[];
    admin_actions: AdminActionItem[];
  };
  system: {
    api: AdminServiceHealth;
    database: AdminServiceHealth;
    storage: {
      used_bytes: number;
      limit_bytes: number | null;
    };
    checked_at: string;
  };
}

export interface AdminStoredFileItem {
  id: string;
  filename: string;
  content_type: string;
  size: number;
  created_at: string;
}

export interface AdminFileTypeMetrics {
  content_type: string;
  count: number;
  total_size_bytes: number;
}

export interface AdminActivityItem {
  id: string;
  type: string;
  actor_name: string;
  actor_role: string | null;
  target_label: string;
  created_at: string;
}

export interface AdminActionItem {
  id: string;
  admin_name: string;
  action: string;
  target_label: string;
  created_at: string;
}

export interface AdminServiceHealth {
  status: "operational" | "degraded" | "down";
  response_time_ms: number;
}