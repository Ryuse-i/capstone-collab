import { useQuery } from "@tanstack/react-query";
import apiClient from "@/services/apiClient";

export interface RedistributionRecommendation {
  id: number;
  detail: string;
  project_id: string;
  suggestion_type: string;
  rank: number;
  expected_workload_after: string;
  deadline_impact: string;
  created_at: string;
  updated_at: string;
}

export function useGetProjectRecommendations(projectId: string) {
  return useQuery({
    queryKey: ["recommendations", "project", projectId],
    queryFn: async () => {
      const response = await apiClient.get<RedistributionRecommendation[]>(
        "/recommendations/",
      );
      return response.data.filter((item) => item.project_id === projectId);
    },
    enabled: !!projectId,
  });
}
