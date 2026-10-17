import { useQuery } from "@tanstack/react-query";
import apiClient from "@/services/apiClient";
import type {
  DecimalValue,
  ProjectHealth,
  ProjectHealthResponse,
} from "@/types/projectHealth"; // NOTE: adjust to wherever you put projectHealth.ts

// NOTE: adjust this to the prefix your project_health_router is mounted
// under in the FastAPI app (e.g. include_router(..., prefix="/project-health")).
const url = "/project_health";

export const projectHealthKeys = {
  all: ["project-health"] as const,
  detail: (project_id: string) =>
    [...projectHealthKeys.all, project_id] as const,
};

// Decimals arrive as strings with pydantic v2 (numbers with v1); Number() handles both.
const num = (value: DecimalValue): number => Number(value);
const numOrNull = (value: DecimalValue | null): number | null =>
  value === null ? null : Number(value);

// Spreading the response first and then overriding the Decimal fields means a Decimal
// field added to the types but forgotten here is a compile error, not a silent string.
export function parseProjectHealth(r: ProjectHealthResponse): ProjectHealth {
  return {
    ...r,
    score: numOrNull(r.score),
    schedule_score: numOrNull(r.schedule_score),
    workload_balance_score: numOrNull(r.workload_balance_score),
    risk_score: numOrNull(r.risk_score),
    activity_score: numOrNull(r.activity_score),
    weights_used: Object.fromEntries(
      Object.entries(r.weights_used).map(([key, value]) => [key, num(value)]),
    ),
    schedule: {
      ...r.schedule,
      score: numOrNull(r.schedule.score),
      overdue_rate: num(r.schedule.overdue_rate),
      at_risk_rate: num(r.schedule.at_risk_rate),
      total_points: num(r.schedule.total_points),
      completed_points: num(r.schedule.completed_points),
      remaining_points: num(r.schedule.remaining_points),
      completion_pct: numOrNull(r.schedule.completion_pct),
      planned_points: num(r.schedule.planned_points),
      earned_points: num(r.schedule.earned_points),
      spi: numOrNull(r.schedule.spi),
    },
    risk: {
      ...r.risk,
      score: num(r.risk.score),
      unassigned_rate: num(r.risk.unassigned_rate),
      spof_rate: numOrNull(r.risk.spof_rate),
      no_eligible_recipient_rate: numOrNull(r.risk.no_eligible_recipient_rate),
    },
    activity: {
      ...r.activity,
      score: numOrNull(r.activity.score),
    },
    balance: {
      ...r.balance,
      score: numOrNull(r.balance.score),
      spread_score: numOrNull(r.balance.spread_score),
      overload_score: numOrNull(r.balance.overload_score),
      severity_score: numOrNull(r.balance.severity_score),
      median_ratio: num(r.balance.median_ratio),
      mad: num(r.balance.mad),
      overloaded_pct: num(r.balance.overloaded_pct),
      max_load_ratio: num(r.balance.max_load_ratio),
    },
  };
}

const api = {
  getProjectHealth: async (project_id: string): Promise<ProjectHealth> => {
    try {
      const response = await apiClient.get<ProjectHealthResponse>(
        `${url}/${project_id}`,
      );
      return parseProjectHealth(response.data);
    } catch (error) {
      console.error("Failed to fetch project health", error);
      throw error;
    }
  },
};

export interface UseProjectHealthOptions {
  // Set false to hold off fetching (for example until some other data has loaded).
  enabled?: boolean;
}

/**
 * Current health of a project. Read-only: the backend calculates it on request, so a
 * mutation that changes tasks, assignments or workload should invalidate it:
 *   queryClient.invalidateQueries({ queryKey: projectHealthKeys.detail(project_id) })
 */
export function useProjectHealth(
  project_id: string | undefined,
  options: UseProjectHealthOptions = {},
) {
  return useQuery({
    queryKey: projectHealthKeys.detail(project_id ?? ""),
    queryFn: () => api.getProjectHealth(project_id as string),
    enabled: Boolean(project_id) && (options.enabled ?? true),
    // The backend does real work per request, so don't refetch on every remount.
    staleTime: 30_000,
  });
}