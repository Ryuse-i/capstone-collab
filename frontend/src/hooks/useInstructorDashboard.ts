// hooks/useDashboard.ts  ->  src/hooks/useDashboard.ts
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/services/apiClient";
import { useCurrentUser } from "@/hooks/useAuth";
import type { InstructorDashboardResponse } from "@/types/instructorDashboard";

const url = "/instructor_dashboard";

const api = {
  getInstructorDashboard: async (): Promise<InstructorDashboardResponse> => {
    try {
      const response = await apiClient.get<InstructorDashboardResponse>(
        `${url}/instructor`,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to get instructor dashboard", error);
      throw error;
    }
  },
};

export const dashboardKeys = {
  all: ["dashboard"] as const,
  instructor: (userId: string) =>
    [...dashboardKeys.all, "instructor", userId] as const,
};

// One request for the whole dashboard. The user id is only part of the cache key so
// two accounts on the same browser never share cached data; the backend uses the token.
export function useGetInstructorDashboard() {
  const { data: user, isLoading: isUserLoading } = useCurrentUser();

  const query = useQuery({
    queryKey: dashboardKeys.instructor(user?.id ?? ""),
    queryFn: api.getInstructorDashboard,
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  return { ...query, isLoading: isUserLoading || query.isLoading };
}