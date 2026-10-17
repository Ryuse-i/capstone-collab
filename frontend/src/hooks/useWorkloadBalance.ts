// hooks/useWorkloadBalance.ts  (put it next to your project hooks)
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import axios from "axios";
import type {
  WorkloadBalanceSummary,
  WorkloadBalanceResponse,
  RecalculateWorkloadBalanceParams,
} from "@/types/workloadBalance";
import apiClient from "@/services/apiClient";
import { projectKeys } from "@/hooks/useProject"; // ADJUST: wherever projectKeys is exported

const url = "/workload_balance";

const api = {
  // 404 = project has no snapshot yet -> null instead of an error state
  getLatest: async (projectId: string): Promise<WorkloadBalanceSummary | null> => {
    try {
      const response = await apiClient.get(`${url}/${projectId}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      console.error("Failed to fetch workload balance", error);
      throw error;
    }
  },

  recalculate: async ({
    projectId,
    today,
  }: RecalculateWorkloadBalanceParams): Promise<WorkloadBalanceResponse> => {
    try {
      const response = await apiClient.post(
        `${url}/${projectId}/recalculate`,
        null,
        { params: today ? { today } : undefined },
      );
      return response.data;
    } catch (error) {
      console.error("Failed to recalculate workload balance", error);
      throw error;
    }
  },
};

export const workloadBalanceKeys = {
  all: ["workload_balance"] as const,
  details: () => [...workloadBalanceKeys.all, "detail"] as const,
  detail: (projectId: string) =>
    [...workloadBalanceKeys.details(), projectId] as const,
  // full breakdown from the last recalculate (only the POST returns it)
  breakdown: (projectId: string) =>
    [...workloadBalanceKeys.all, "breakdown", projectId] as const,
};

// Latest persisted score + severity (cheap, no recompute)
export function useGetWorkloadBalance(projectId: string) {
  return useQuery({
    queryKey: workloadBalanceKeys.detail(projectId),
    queryFn: () => api.getLatest(projectId),
    enabled: !!projectId,
  });
}

// Reads the breakdown cached by the last recalculate. Never fetches by itself.
export function useWorkloadBalanceBreakdown(projectId: string) {
  return useQuery<WorkloadBalanceResponse | null>({
    queryKey: workloadBalanceKeys.breakdown(projectId),
    queryFn: () => null,
    enabled: false,
    initialData: null,
    staleTime: Infinity,
  });
}

// Recompute + persist, then refresh everything that shows the score
export function useRecalculateWorkloadBalance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.recalculate,
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        workloadBalanceKeys.breakdown(variables.projectId),
        data,
      );
      queryClient.invalidateQueries({
        queryKey: workloadBalanceKeys.detail(variables.projectId),
      });
      // project snapshots embed workload_balance / imbalance_severity
      queryClient.invalidateQueries({ queryKey: projectKeys.details() });
      queryClient.invalidateQueries({
        queryKey: [...projectKeys.all, "listSnapshot"],
      });
    },
  });
}