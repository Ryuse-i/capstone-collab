import apiClient from "@/services/apiClient";
import type {
  AssignedMemberResponse,
  CreateAssignedMember,
  UpdateAssignedMember,
} from "@/types/assigned_member";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UserBase } from "@/types/user";

const url = "/assigned_members";
const api = {
  getAll: async (): Promise<AssignedMemberResponse[]> => {
    try {
      const response = await apiClient.get<AssignedMemberResponse[]>(url);
      return response.data;
    } catch (error) {
      console.error("Failed to get all assigned members", error);
      throw error;
    }
  },

  getOne: async (id: string): Promise<AssignedMemberResponse> => {
    try {
      const response = await apiClient.get<AssignedMemberResponse>(
        `${url}/${id}`,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to get assigned member", error);
      throw error;
    }
  },

  create: async (
    member: CreateAssignedMember,
  ): Promise<AssignedMemberResponse> => {
    try {
      const response = await apiClient.post<AssignedMemberResponse>(
        url,
        member,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to assign member", error);
      throw error;
    }
  },

  batchCreate()

  update: async (
    id: string,
    member: UpdateAssignedMember,
  ): Promise<AssignedMemberResponse> => {
    try {
      const response = await apiClient.patch<AssignedMemberResponse>(
        `${url}/${id}`,
        member,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to update memebr", error);
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`${url}/${id}`);
    } catch (error) {
      console.error("Failed to delete member", error);
      throw error;
    }
  },

  getTaskMembers: async (task_id: string): Promise<UserBase[]> => {
    try {
      const response = await apiClient.get<UserBase[]>(
        `${url}/task/${task_id}`,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to get members", error);
      throw error;
    }
  },
};

export const assignedMemberKeys = {
  all: "assigned_members" as const,
  list: () => [...assignedMemberKeys.all, "list"] as const,
  task_list: (id: string) =>
    [...assignedMemberKeys.list(), "task", id] as const,
  details: () => [...assignedMemberKeys.all, "details"] as const,
  detail: (id: string) => [...assignedMemberKeys.details(), id] as const,
};

export function useGetAllAssignedMembers() {
  return useQuery({
    queryKey: assignedMemberKeys.list(),
    queryFn: api.getAll,
  });
}

export function useGetOneAssignedMember(id: string) {
  return useQuery({
    queryKey: assignedMemberKeys.detail(id),
    queryFn: () => api.getOne(id),
  });
}

export function useGetTaskMembers(id: string) {
  return useQuery({
    queryKey: assignedMemberKeys.task_list(id),
    queryFn: () => api.getTaskMembers(id),
  });
}

export function useCreateAssignedMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assignedMemberKeys.list() });
    },
  });
}

export function useUpdateAssignedMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      member,
    }: {
      id: string;
      member: UpdateAssignedMember;
    }) => api.update(id, member),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: assignedMemberKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: assignedMemberKeys.list() });
    },
  });
}

export function useDeleteAssignedMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.delete,
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: assignedMemberKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: assignedMemberKeys.list() });
    },
  });
}
