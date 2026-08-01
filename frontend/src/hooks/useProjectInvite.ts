import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/services/apiClient";
import type {
  CreateInvite,
  UpdateInvite,
  InviteResponse,
} from "@/types/project_invite";

const url = "/invitations";

const api = {
  getOne: async (id: string): Promise<InviteResponse> => {
    try {
      const response = await apiClient.get(`${url}/${id}`);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch invite", error);
      throw error;
    }
  },

  getAll: async (): Promise<InviteResponse[]> => {
    try {
      const response = await apiClient.get(url);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch all invite", error);
      throw error;
    }
  },

  create: async (invite: CreateInvite): Promise<InviteResponse> => {
    try {
      const response = await apiClient.post<InviteResponse>(url, invite);
      return response.data;
    } catch (error) {
      console.error("Failed to create invite", error);
      throw error;
    }
  },

  batch_create: async (
    invite_list: CreateInvite[],
  ): Promise<InviteResponse[]> => {
    try {
      const response = await apiClient.post<InviteResponse[]>(
        `${url}/batch`,
        invite_list,
      );
      return response.data;
    } catch (error) {
      console.error("Something went wrong when batch creating invite");
      throw error;
    }
  },

  update: async (id: string, invite: UpdateInvite): Promise<InviteResponse> => {
    try {
      const response = await apiClient.patch(`${url}/${id}`, invite);
      return response.data;
    } catch (error) {
      console.error("Failed to update invite", error);
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`${url}/${id}`);
    } catch (error) {
      console.error("Failed to delete invite", error);
      throw error;
    }
  },

  accept: async (id: string): Promise<InviteResponse> => {
    try {
      const response = await apiClient.post<InviteResponse>(
        `${url}/${id}/accept`,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to accept invite", error);
      throw error;
    }
  },

  decline: async (id: string): Promise<InviteResponse> => {
    try {
      const response = await apiClient.post<InviteResponse>(
        `${url}/${id}/decline`,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to decline invite", error);
      throw error;
    }
  },
};

export const inviteKeys = {
  all: ["invites"] as const,
  list: () => [...inviteKeys.all, "list"] as const,
  details: () => [...inviteKeys.all] as const,
  detail: (id: string) => [...inviteKeys.details(), id] as const,
};

export function useGetOneInvite(id?: string) {
  return useQuery({
    // only enable the query when an id is provided
    queryKey: id ? inviteKeys.detail(id) : (["invites", "idle"] as const),
    queryFn: () => api.getOne(id!),
    enabled: !!id,
  });
}

export function useGetAllInvite() {
  return useQuery({
    queryKey: inviteKeys.list(),
    queryFn: () => api.getAll(),
  });
}

export function useCreateInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inviteKeys.list() });
    },
  });
}

export function useBatchCreateInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.batch_create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inviteKeys.list() });
    },
  });
}

export function useUpdateInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, invite }: { id: string; invite: UpdateInvite }) =>
      api.update(id, invite),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: inviteKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: inviteKeys.list(),
      });
    },
  });
}

export function useDeleteInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.delete,
    onSuccess: (_, id) => {
      queryClient.removeQueries({
        queryKey: inviteKeys.detail(id),
      });
      queryClient.invalidateQueries({
        queryKey: inviteKeys.list(),
      });
    },
  });
}

export function useAcceptInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.accept(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({
        queryKey: inviteKeys.detail(id),
      });
      queryClient.invalidateQueries({
        queryKey: inviteKeys.list(),
      });
    },
  });
}

export function useDeclineInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.decline(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({
        queryKey: inviteKeys.detail(id),
      });
      queryClient.invalidateQueries({
        queryKey: inviteKeys.list(),
      });
    },
  });
}
