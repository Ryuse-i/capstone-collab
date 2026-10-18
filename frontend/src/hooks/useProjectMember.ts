import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  MemberBase,
  CreateProjectMember,
  UpdateProjectMember,
  ProjectMemberUserResponse,
  ProjectMemberResponse,
  ProjectMemberUserSnapshot,
} from "@/types/project_member";
import apiClient from "@/services/apiClient";

const url = "/project_members";

const api = {
  getMemberByUserAndProject: async (
    user_id: string,
    project_id: string,
  ): Promise<ProjectMemberResponse | null> => {
    try {
      const response = await apiClient.get<ProjectMemberResponse | null>(
        `${url}/by-user/${user_id}/project/${project_id}`,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to get member by user and project", error);
      throw error;
    }
  },
  getAll: async (): Promise<MemberBase[]> => {
    try {
      const response = await apiClient.get<MemberBase[]>(url);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch members", error);
      throw error;
    }
  },

  getOneMember: async (id: string): Promise<MemberBase> => {
    try {
      const response = await apiClient.get<MemberBase>(`${url}/${id}`);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch member", error);
      throw error;
    }
  },

  getMemberWithUserInfo: async (
    project_id: string,
  ): Promise<ProjectMemberUserResponse[]> => {
    try {
      const response = await apiClient.get<ProjectMemberUserResponse[]>(
        `${url}/users/${project_id}`,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to get members", error);
      throw error;
    }
  },

  getCurrentMember: async (
    member_id: string,
  ): Promise<ProjectMemberResponse> => {
    try {
      const response = await apiClient.get<ProjectMemberResponse>(
        `${url}/current/${member_id}`,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to get member", error);
      throw error;
    }
  },

  create: async (member: CreateProjectMember): Promise<MemberBase> => {
    try {
      const response = await apiClient.post<MemberBase>(url, member);
      return response.data;
    } catch (error) {
      console.error("Failed to add member", error);
      throw error;
    }
  },

  update: async (
    id: string,
    member: UpdateProjectMember,
  ): Promise<MemberBase> => {
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

  getMemberWithUserSnapshot: async (
    project_id: string,
  ): Promise<ProjectMemberUserSnapshot[]> => {
    try {
      const response = await apiClient.get<ProjectMemberUserSnapshot[]>(
        `${url}/with-user-snapshot/${project_id}`,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to get project members", error);
      throw error;
    }
  },

  getProjectMemberByUserId: async (
    user_id: string,
  ): Promise<ProjectMemberResponse> => {
    try {
      const response = await apiClient.get<ProjectMemberResponse>(
        `${url}/by-user/${user_id}`,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to get project member by user id", error);
      throw error;
    }
  },
};

export const memberKeys = {
  all: ["members"] as const,
  list: () => [...memberKeys.all, "list"] as const,
  details: () => [...memberKeys.all, "detail"] as const,
  detail: (id: string) => [...memberKeys.details(), id] as const,
  userDetail: (id: string) => [...memberKeys.details(), id, "user"] as const,
  byProject: (id: string) => [...memberKeys.all, id, "project"] as const,
  snapshots: () => [...memberKeys.all, "snapshot"] as const,
  snapshotByProject: (id: string) => [...memberKeys.snapshots(), id] as const,
  byUser: (user_id: string) => [...memberKeys.all, user_id, "by-user"] as const,
  byUserAndProject: (user_id: string, project_id: string) =>
    [...memberKeys.all, user_id, project_id, "by-user-project"] as const,
};

export function useGetMembers() {
  return useQuery({
    queryKey: memberKeys.list(),
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
      queryClient.invalidateQueries({ queryKey: memberKeys.snapshots() });
    },
  });
}

export function useUpdateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, member }: { id: string; member: UpdateProjectMember }) =>
      api.update(id, member),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: memberKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: memberKeys.list() });
      // Refresh the Team page / drawer data (skills live in the snapshot response)
      queryClient.invalidateQueries({ queryKey: memberKeys.snapshots() });
    },
  });
}

export function useDeleteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.delete,
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: memberKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: memberKeys.list() });
      queryClient.invalidateQueries({ queryKey: memberKeys.snapshots() });
    },
  });
}

export function useGetMembersWithUserInfo(project_id: string) {
  return useQuery({
    queryKey: memberKeys.byProject(project_id),
    queryFn: () => api.getMemberWithUserInfo(project_id),
    enabled: !!project_id,
  });
}

export function useGetCurrentMember(member_id: string) {
  return useQuery({
    queryKey: memberKeys.userDetail(member_id),
    queryFn: () => api.getCurrentMember(member_id),
    enabled: !!member_id,
  });
}

export function useGetMembersWithUserSnapshot(project_id: string) {
  return useQuery({
    queryKey: memberKeys.snapshotByProject(project_id),
    queryFn: () => api.getMemberWithUserSnapshot(project_id),
    enabled: !!project_id,
  });
}

export function useGetProjectMemberByUserId(user_id: string) {
  return useQuery({
    queryKey: memberKeys.byUser(user_id),
    queryFn: () => api.getProjectMemberByUserId(user_id),
    enabled: !!user_id,
  });
}

export function useGetMemberByUserAndProject(
  user_id: string,
  project_id: string,
) {
  return useQuery({
    queryKey: memberKeys.byUserAndProject(user_id, project_id),
    queryFn: () => api.getMemberByUserAndProject(user_id, project_id),
    enabled: !!user_id && !!project_id,
    retry: false,
  });
}