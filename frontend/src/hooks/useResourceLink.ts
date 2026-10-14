import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/services/apiClient";
import type {
  CreateResourceLink,
  UpdateResourceLink,
  ResourceLinkResponse,
} from "@/types/resource_link";

const url = "/resource_links";

const api = {
  getByResource: async (resource_id: string): Promise<ResourceLinkResponse[]> => {
    try {
      const response = await apiClient.get<ResourceLinkResponse[]>(
        `${url}/resources/${resource_id}`,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to get resource links", error);
      throw error;
    }
  },

  create: async (
    resource_id: string,
    link: CreateResourceLink,
  ): Promise<ResourceLinkResponse> => {
    try {
      const response = await apiClient.post<ResourceLinkResponse>(
        `${url}/resources/${resource_id}`,
        link,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to add resource link", error);
      throw error;
    }
  },

  update: async (
    link_id: string,
    link: UpdateResourceLink,
  ): Promise<ResourceLinkResponse> => {
    try {
      const response = await apiClient.patch<ResourceLinkResponse>(
        `${url}/${link_id}`,
        link,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to update resource link", error);
      throw error;
    }
  },

  delete: async (link_id: string): Promise<void> => {
    try {
      await apiClient.delete(`${url}/${link_id}`);
    } catch (error) {
      console.error("Failed to delete resource link", error);
      throw error;
    }
  },
};

export const resourceLinkKeys = {
  all: ["resource-links"] as const,
  byResource: (resource_id: string) =>
    [...resourceLinkKeys.all, "byResource", resource_id] as const,
};

export function useGetResourceLinks(resource_id: string) {
  return useQuery({
    queryKey: resourceLinkKeys.byResource(resource_id),
    queryFn: () => api.getByResource(resource_id),
    enabled: !!resource_id,
  });
}

export function useCreateResourceLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ resource_id, link }: { resource_id: string; link: CreateResourceLink }) =>
      api.create(resource_id, link),
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: resourceLinkKeys.byResource(result.resource_id),
      });
    },
  });
}

export function useUpdateResourceLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ link_id, link }: { link_id: string; link: UpdateResourceLink }) =>
      api.update(link_id, link),
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: resourceLinkKeys.byResource(result.resource_id),
      });
    },
  });
}

export function useDeleteResourceLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ link_id, resource_id }: { link_id: string; resource_id: string }) =>
      api.delete(link_id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: resourceLinkKeys.byResource(variables.resource_id),
      });
    },
  });
}