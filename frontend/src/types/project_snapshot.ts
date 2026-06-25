export type Severity = "low" | "medium" | "high" | "critical"; // adjust to match your Python Severity enum
export type Status = "healthy" | "at_risk" | "critical"; // adjust to match your Python Status enum

export interface ProjectSnapshot {
  id: string;
  project_id: string; // UUID
  total_workload_points: number;
  avg_workload: number; // Decimal
  progress_score: number; // Decimal
  progress_percentage: number;
  expected_score: number; // Decimal
  expected_percentage: number;
  schedule_variance: number; // Decimal
  completed_tasks: number;
  workload_balance: number; // Decimal
  imbalance_severity: Severity;
  health_score: number; // Decimal
  health_status: Status;
  created_at: string; // datetime
  updated_at: string; // datetime
}

export type CreateProjectSnapshot = Omit<
  ProjectSnapshot,
  "id" | "created_at" | "updated_at"
>;
export type UpdateProjectSnapshot = Partial<
  Omit<ProjectSnapshot, "id" | "created_at" | "updated_at">
>;
