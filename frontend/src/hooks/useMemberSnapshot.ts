import { useMutation, useQueryClient } from "@tanstack/react-query";

import { memberKeys } from "@/hooks/useProjectMember";
import apiClient from "@/services/apiClient";
import type { MemberSnapshotResponse } from "@/types/member_snapshot";

type UpdateMemberCapacity = {
  memberId: string;
  snapshotId?: string;
  capacityMultiplier: number;
};

export function useUpdateMemberCapacity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      memberId,
      snapshotId,
      capacityMultiplier,
    }: UpdateMemberCapacity) => {
      const payload = { capacity_multiplier: capacityMultiplier };
      const response = snapshotId
        ? await apiClient.patch<MemberSnapshotResponse>(
            `/member_snapshots/${snapshotId}`,
            payload,
          )
        : await apiClient.post<MemberSnapshotResponse>(
            `/member_snapshots/${memberId}/upsert`,
            payload,
          );

      return response.data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: memberKeys.snapshots() }),
  });
}