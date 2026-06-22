import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  ProjectMember,
  UpdateProjectMemberInput,
  CreateProjectMemberInput,
} from "@/types/project_member";
import apiClient from "@/services/apiClient";
import { projectKeys } from "./useProject";

const url = "/project-members";

const api = {
  getAll: async (): Promise<ProjectMember[]> => {
    try {
      const response = await apiClient.get<ProjectMember[]>(url);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch members", error);
      throw error;
    }
  },

  getOneMember: async (id: string): Promise<ProjectMember> => {
    try {
      const response = await apiClient.get(`${url}/${id}`);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch member", error);
      throw error;
    }
  },

  create: async (member: CreateProjectMemberInput): Promise<ProjectMember> => {
    try {
      const response = await apiClient.post<ProjectMember>(url, member);
      return response.data;
    } catch (error) {
      console.error("Failed to add member", error);
      throw error;
    }
  },
  update: async (
    id: string,
    member: UpdateProjectMemberInput,
  ): Promise<ProjectMember> => {
    try {
      const response = await apiClient.patch(`${url}/${id}`, member);
      return response.data;
    } catch (error) {
      console.error("Failed to update member", error);
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
};

export const memberKeys = {
  all: ["members"] as const,
  list: () => [...memberKeys.all, "list"] as const,
  details: () => [...memberKeys.all, "detail"] as const,
  detail: (id: string) => [...memberKeys.details(), id] as const,
};

export function useGetMembers() {
  return useQuery({
    queryKey: projectKeys.list(),
    queryFn: api.getAll,
  });
}

export function useGetOneMember(id: string) {
  return useQuery({
    queryKey: memberKeys.detail(id),
    queryFn: () => api.getOneMember(id),
    enabled: !!id,
  });
}

export function useCreateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.list() });
    },
  });
}

export function useUpdateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      member,
    }: {
      id: string;
      member: UpdateProjectMemberInput;
    }) => api.update(id, member),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: memberKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: memberKeys.list() });
    },
  });
}

export function useDeteleMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.delete,
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: memberKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: memberKeys.list() });
    },
  });
}
