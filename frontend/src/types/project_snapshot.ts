export type Severity = "low" | "medium" | "high" | "critical"; // adjust to match your Python Severity enum
export type Status = "healthy" | "at_risk" | "critical"; // adjust to match your Python Status enum

export interface ProjectSnapshotCreate {
  project_id: string; // UUID
  total_workload_points: number;
  avg_workload: number; // Decimal
  progress_score: number; // Decimal
  progress_percentage: number;
  expected_score: number; // Decimal
  expected_percentage: number;
  schedule_variance: number; // Decimal
  workload_balance?: number | null; // Decimal
  imbalance_severity: Severity;
  health_score: number; // Decimal
  health_status: Status;
}

export interface ProjectSnapshotUpdate {
  project_id?: string | null; // UUID
  total_workload_points?: number | null;
  avg_workload?: number | null; // Decimal
  progress_score?: number | null; // Decimal
  progress_percentage?: number | null;
  expected_score?: number | null; // Decimal
  expected_percentage?: number | null;
  schedule_variance?: number | null; // Decimal
  workload_balance?: number | null; // Decimal
  imbalance_severity?: Severity | null;
  health_score?: number | null; // Decimal
  health_status?: Status | null;
}

export interface ProjectSnapshotResponse {
  id: number;
  project_id: string; // UUID
  total_workload_points: number;
  avg_workload: number; // Decimal
  progress_score: number; // Decimal
  progress_percentage: number;
  expected_score: number; // Decimal
  expected_percentage: number;
  schedule_variance: number; // Decimal
  workload_balance?: number | null; // Decimal
  imbalance_severity: Severity;
  health_score: number; // Decimal
  health_status: Status;
  created_at?: string | null; // datetime
  updated_at?: string | null; // datetime
}
