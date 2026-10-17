// Types for GET /project-health/{project_id}. Mirrors the backend ProjectHealthResponse.
//
// Decimal fields: pydantic v2 sends a Decimal as a JSON string ("71.58"), v1 sends a
// number. The wire types accept both (DecimalValue); useProjectHealth converts everything
// to plain numbers, so components only ever see `ProjectHealth`.
//
// null means N/A (for example the workload balance when everyone's work is done).
// Show "N/A" for those, never 0.

export type DecimalValue = string | number;

export type HealthStatus = "healthy" | "watch" | "at_risk";

// `N` is the number type used for Decimal fields: DecimalValue as sent, number once parsed.
// One shape, two instantiations, so the two can never drift apart.

export interface WorkloadBalanceOf<N> {
  applicable: boolean; // false -> every score below is null (N/A)
  spread_used: boolean; // false for small teams: spread is shown but not scored
  score: N | null;
  spread_score: N | null;
  overload_score: N | null;
  severity_score: N | null;
  median_ratio: N;
  mad: N;
  total_members: number;
  overloaded_count: number; // excludes silenced members
  overloaded_pct: N; // 0-1
  max_load_ratio: N;
  max_load_member_id: string | null; // UUID
  underutilized_member_ids: string[]; // UUIDs
}

export interface ScheduleMetricsOf<N> {
  applicable: boolean; // false when the project has no live tasks
  score: N | null;
  open_tasks: number;
  overdue_tasks: number;
  overdue_rate: N; // 0-1
  at_risk_tasks: number;
  at_risk_rate: N; // 0-1
  total_points: N;
  completed_points: N;
  remaining_points: N;
  completion_pct: N | null; // 0-100, points-weighted
  planned_points: N;
  earned_points: N;
  spi: N | null; // null when nothing was planned yet
  extension_count: number;
}

export interface RiskMetricsOf<N> {
  score: N;
  chronic_count: number;
  open_tasks: number;
  unassigned_count: number;
  unassigned_rate: N; // 0-1
  spof_count: number;
  spof_rate: N | null; // null = not computed yet
  no_eligible_recipient_rate: N | null;
}

export interface ActivityMetricsOf<N> {
  applicable: boolean; // false when nothing is In Progress
  score: N | null;
  in_progress_tasks: number;
  stale_in_progress: number;
  recent_completions: number;
}

export interface ProjectHealthOf<N> {
  score: N | null; // headline, 0-100
  status: HealthStatus; // after the override rules
  base_status: HealthStatus; // from the score alone
  // Rules that made the status worse. Currently "chronic_escalation" | "overdue_rate".
  overrides_applied: string[];
  // Always show these next to the headline. null = N/A.
  schedule_score: N | null;
  workload_balance_score: N | null;
  risk_score: N | null;
  activity_score: N | null;
  // Weights actually used, after dropping N/A components. Keys: schedule, workload_balance, risk, activity.
  weights_used: Record<string, N>;
  schedule: ScheduleMetricsOf<N>;
  risk: RiskMetricsOf<N>;
  activity: ActivityMetricsOf<N>;
  balance: WorkloadBalanceOf<N>;
}

/** Exactly what the API sends. */
export type ProjectHealthResponse = ProjectHealthOf<DecimalValue>;

/** What the UI works with: every Decimal is a number. */
export type ProjectHealth = ProjectHealthOf<number>;