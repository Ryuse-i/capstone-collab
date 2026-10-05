import { useQuery } from "@tanstack/react-query";
import apiClient from "@/services/apiClient";
import { adminKeys } from "@/hooks/useAdminUsers";
import type { AdminMetricsOverview } from "@/types/admin_metrics";

async function getOverview(): Promise<AdminMetricsOverview> {
  const response = await apiClient.get<AdminMetricsOverview>(
    "/admin/metrics/overview",
  );
  return response.data;
}

export function useAdminMetrics() {
  return useQuery({
    queryKey: adminKeys.overview(),
    queryFn: getOverview,
    refetchInterval: 60_000,
  });
}