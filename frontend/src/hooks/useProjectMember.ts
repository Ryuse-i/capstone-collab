import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  ProjectMember,
  UpdateProjectMemberInput,
  CreateProjectMemberInput,
} from "@/types/project_member";
import apiClient from "@/services/apiClient";

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

const Project_Member_Key = ["project-members"];

export function useProjectMembers() {
  const queryClient = useQueryClient();

  const getMembers = useQuery({
    queryKey: Project_Member_Key,
    queryFn: api.getAll,
  });

  const createMember = useMutation({
    mutationFn: api.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: Project_Member_Key });
    },
  });

  const updateMember = useMutation({
    mutationFn: ({
      id,
      member,
    }: {
      id: string;
      member: UpdateProjectMemberInput;
    }) => api.update(id, member),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: Project_Member_Key });
    },
  });

  const deleteMember = useMutation({
    mutationFn: api.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: Project_Member_Key });
    },
  });

  return {
    getMembers: getMembers.data ?? [],
    isLoading: getMembers.isLoading,
    getError: getMembers.error,

    createMember: createMember.mutate,
    isCreating: createMember.isPending,
    createError: createMember.error,

    updateMember: updateMember.mutate,
    isUpdating: updateMember.isPending,
    updateError: updateMember.error,

    deleteMember: deleteMember.mutate,
    isDeleting: deleteMember.isPending,
    deleteError: deleteMember.error,
  };
}
