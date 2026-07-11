export type Severity = "low" | "medium" | "high" | "critical"; // adjust to match your Python Severity enum
export type Status = "healthy" | "at_risk" | "critical"; // adjust to match your Python Status enum

export interface ProjectSnapshotBase {
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
}

export interface ProjectSnapshotResponse extends ProjectSnapshotBase {
  id: string;
  snapshot_date: string;
}

export type CreateProjectSnapshot = ProjectSnapshotBase;

export type UpdateProjectSnapshot = Partial<ProjectSnapshotBase>;
