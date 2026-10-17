// types/workload_balance.ts
//
// Mirrors app/modules/workload_balance/schema.py.
// NOTE: pydantic v2 serialises Decimal as a JSON *string* ("72.50"). Types below reflect
// that. If your backend already converts Decimals to numbers, change DecimalString to number.

export type DecimalString = string;

// ASSUMPTION: adjust to the real Severity enum values (or import it from "./project_snapshot"
// if it is already exported there).
export type ImbalanceSeverity = "low" | "medium" | "high";

/** Latest persisted values on the project snapshot. GET /workload_balance/{project_id} */
export interface WorkloadBalanceSummary {
  project_id: string; // UUID
  workload_balance: DecimalString | null; // null = N/A
  imbalance_severity: ImbalanceSeverity;
  snapshot_date: string; // date, YYYY-MM-DD
}

/** Full breakdown. POST /workload_balance/{project_id}/recalculate
 *  When applicable is false every score is null -> show "N/A". */
export interface WorkloadBalanceResponse {
  applicable: boolean;
  spread_used: boolean; // false = team too small, spread_score has zero weight
  score: DecimalString | null; // 0-100, higher = healthier
  spread_score: DecimalString | null;
  overload_score: DecimalString | null;
  severity_score: DecimalString | null;
  median_ratio: DecimalString;
  mad: DecimalString;
  total_members: number;
  overloaded_count: number;
  overloaded_pct: DecimalString; // 0-1
  max_load_ratio: DecimalString;
  max_load_member_id: string | null; // UUID
  underutilized_member_ids: string[]; // UUIDs
  imbalance_severity: ImbalanceSeverity;
}

export interface RecalculateWorkloadBalanceParams {
  projectId: string;
  /** YYYY-MM-DD. Testing only, overrides "today" on the backend. */
  today?: string;
}