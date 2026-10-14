import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/services/apiClient";
import type {
  CreateProjectResourceInput,
  ProjectResource,
  ResourceUrlResponse,
} from "@/types/resource";

const url = "/resources";

export type UpdateProjectResourceInput = Partial<
  Pick<
    CreateProjectResourceInput,
    "title" | "category" | "description" | "attachment"
  >
>;

const api = {
  listByProject: async (projectId: string): Promise<ProjectResource[]> => {
    const response = await apiClient.get<ProjectResource[]>(
      `${url}/projects/${projectId}`,
    );
    return response.data;
  },

  create: async ({
    projectId,
    resource,
  }: {
    projectId: string;
    resource: CreateProjectResourceInput;
  }): Promise<ProjectResource> => {
    const formData = new FormData();
    formData.append("title", resource.title);
    formData.append("category", resource.category);
    formData.append("description", resource.description);
    if (resource.attachment) formData.append("attachment", resource.attachment);

    const response = await apiClient.post<ProjectResource>(
      `${url}/projects/${projectId}`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return response.data;
  },

  update: async ({
    resourceId,
    resource,
  }: {
    resourceId: string;
    resource: UpdateProjectResourceInput;
  }): Promise<ProjectResource> => {
    const formData = new FormData();
    if (resource.title !== undefined) formData.append("title", resource.title);
    if (resource.category !== undefined) formData.append("category", resource.category);
    if (resource.description !== undefined) formData.append("description", resource.description);
    if (resource.attachment) formData.append("attachment", resource.attachment);

    const response = await apiClient.patch<ProjectResource>(
      `${url}/${resourceId}`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return response.data;
  },

  open: async (resourceId: string): Promise<ResourceUrlResponse> => {
    const response = await apiClient.post<ResourceUrlResponse>(
      `${url}/${resourceId}/open`,
    );
    return response.data;
  },

  remove: async (resourceId: string): Promise<void> => {
    await apiClient.delete(`${url}/${resourceId}`);
  },
};

export const resourceKeys = {
  all: ["resources"] as const,
  list: (projectId: string) => [...resourceKeys.all, "project", projectId] as const,
};

export function useProjectResources(projectId?: string) {
  return useQuery({
    queryKey: projectId ? resourceKeys.list(projectId) : [...resourceKeys.all, "idle"],
    queryFn: () => api.listByProject(projectId!),
    enabled: Boolean(projectId),
  });
}

export function useCreateProjectResource(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (resource: CreateProjectResourceInput) =>
      api.create({ projectId, resource }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: resourceKeys.list(projectId) }),
  });
}

export function useUpdateProjectResource(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { resourceId: string; resource: UpdateProjectResourceInput }) =>
      api.update(vars),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: resourceKeys.list(projectId) }),
  });
}

export function useOpenProjectResource(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.open,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: resourceKeys.list(projectId) }),
  });
}

export function useDeleteProjectResource(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.remove,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: resourceKeys.list(projectId) }),
  });
}