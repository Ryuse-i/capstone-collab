import { useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/services/apiClient";
import { projectKeys } from "@/hooks/useProject";
import { memberKeys } from "@/hooks/useProjectMember";

// NOTE: adjust this to the prefix your project_snapshot_router is mounted
// under in the FastAPI app (e.g. include_router(..., prefix="/project_snapshots")).
const url = "/project_snapshots";

// The backend returns whatever the workload calculation produces, so keep
// this loose until you want to type it properly.
export type RecalculateWorkloadResult = Record<string, unknown>;

export interface RecalculateWorkloadVariables {
  project_id: string;
  // Optional YYYY-MM-DD override, only useful for testing.
  today?: string;
}

const api = {
  recalculateWorkload: async ({
    project_id,
    today,
  }: RecalculateWorkloadVariables): Promise<RecalculateWorkloadResult> => {
    try {
      const response = await apiClient.post<RecalculateWorkloadResult>(
        `${url}/${project_id}/recalculate-workload`,
        null,
        { params: today ? { today } : undefined },
      );
      return response.data;
    } catch (error) {
      console.error("Failed to recalculate project workload", error);
      throw error;
    }
  },
};

export function useRecalculateWorkload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.recalculateWorkload,
    // Returning the promise keeps `isPending` true until the refreshed
    // snapshots have actually been refetched, so the UI doesn't flicker.
    onSuccess: async (_, variables) => {
      await Promise.all([
        // Covers projectKeys.detail and projectKeys.detailSnapshot
        queryClient.invalidateQueries({ queryKey: projectKeys.details() }),
        queryClient.invalidateQueries({
          queryKey: memberKeys.snapshotByProject(variables.project_id),
        }),
      ]);
    },
  });
}
