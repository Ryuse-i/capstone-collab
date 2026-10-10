import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/services/apiClient";
import type {
  AdminUser,
  AdminUserFilters,
  AdminUserListResponse,
  CreateAdminUserPayload,
  UpdateAdminUserPayload,
} from "@/types/admin_user";

const url = "/admin/users";

const api = {
  list: async (filters: AdminUserFilters): Promise<AdminUserListResponse> => {
    const response = await apiClient.get<AdminUserListResponse>(url, {
      params: filters,
    });
    return response.data;
  },

  createInstructor: async (
    payload: CreateAdminUserPayload,
  ): Promise<AdminUser> => {
    const response = await apiClient.post<AdminUser>(url, payload);
    return response.data;
  },

  update: async ({
    id,
    payload,
  }: {
    id: string;
    payload: UpdateAdminUserPayload;
  }): Promise<AdminUser> => {
    const response = await apiClient.patch<AdminUser>(`${url}/${id}`, payload);
    return response.data;
  },

  deactivate: async (id: string): Promise<AdminUser> => {
    const response = await apiClient.post<AdminUser>(`${url}/${id}/deactivate`);
    return response.data;
  },

  reactivate: async (id: string): Promise<AdminUser> => {
    const response = await apiClient.post<AdminUser>(`${url}/${id}/reactivate`);
    return response.data;
  },

  resetPassword: async ({
    id,
    password,
  }: {
    id: string;
    password: string;
  }): Promise<AdminUser> => {
    const response = await apiClient.post<AdminUser>(
      `${url}/${id}/reset-password`,
      { password },
    );
    return response.data;
  },

  softDelete: async (id: string): Promise<AdminUser> => {
    const response = await apiClient.delete<AdminUser>(`${url}/${id}`);
    return response.data;
  },
};

export const adminKeys = {
  all: ["admin"] as const,
  overview: () => [...adminKeys.all, "metrics", "overview"] as const,
  users: () => [...adminKeys.all, "users"] as const,
  lists: () => [...adminKeys.users(), "list"] as const,
  list: (filters: AdminUserFilters) =>
    [...adminKeys.lists(), filters] as const,
  details: () => [...adminKeys.users(), "detail"] as const,
  detail: (id: string) => [...adminKeys.details(), id] as const,
};

export function useAdminUsers(filters: AdminUserFilters) {
  return useQuery({
    queryKey: adminKeys.list(filters),
    queryFn: () => api.list(filters),
  });
}

function useRefreshAdminUsers() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: adminKeys.lists() });
}

export function useCreateAdminUser() {
  const refreshUsers = useRefreshAdminUsers();
  return useMutation({
    mutationFn: api.createInstructor,
    onSuccess: refreshUsers,
  });
}

export function useUpdateAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.update,
    onSuccess: (user) => {
      queryClient.setQueryData(adminKeys.detail(user.id), user);
      queryClient.invalidateQueries({ queryKey: adminKeys.lists() });
    },
  });
}

export function useDeactivateAdminUser() {
  const refreshUsers = useRefreshAdminUsers();
  return useMutation({
    mutationFn: api.deactivate,
    onSuccess: refreshUsers,
  });
}

export function useReactivateAdminUser() {
  const refreshUsers = useRefreshAdminUsers();
  return useMutation({
    mutationFn: api.reactivate,
    onSuccess: refreshUsers,
  });
}

export function useResetAdminUserPassword() {
  const refreshUsers = useRefreshAdminUsers();
  return useMutation({
    mutationFn: api.resetPassword,
    onSuccess: refreshUsers,
  });
}

export function useSoftDeleteAdminUser() {
  const refreshUsers = useRefreshAdminUsers();
  return useMutation({
    mutationFn: api.softDelete,
    onSuccess: refreshUsers,
  });
}