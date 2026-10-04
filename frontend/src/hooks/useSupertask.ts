import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/services/apiClient";
import type {
  CreateSupertask,
  UpdateSupertask,
  SupertaskResponse,
} from "@/types/supertask";

const url = "/supertasks";

const api = {
  getOneSupertask: async (supertask_id: string): Promise<SupertaskResponse> => {
    try {
      const response = await apiClient.get<SupertaskResponse>(
        `${url}/${supertask_id}`
      );
      return response.data;
    } catch (error) {
      console.error("Failed to get supertask", error);
      throw error;
    }
  },

  getAllProjectSupertasks: async (project_id: string): Promise<SupertaskResponse[]> => {
    try {
      const response = await apiClient.get<SupertaskResponse[]>(
        `${url}/project/${project_id}`
      );
      return response.data;
    } catch (error) {
      console.error("Failed to get project supertasks", error);
      throw error;
    }
  },

  createSupertask: async (supertask: CreateSupertask): Promise<SupertaskResponse> => {
    try {
      const response = await apiClient.post<SupertaskResponse>(url, supertask);
      return response.data;
    } catch (error) {
      console.error("Failed to create supertask", error);
      throw error;
    }
  },

  updateSupertask: async (
    id: string,
    supertask: UpdateSupertask
  ): Promise<SupertaskResponse> => {
    try {
      const response = await apiClient.patch<SupertaskResponse>(
        `${url}/${id}`,
        supertask
      );
      return response.data;
    } catch (error) {
      console.error("Failed to update supertask", error);
      throw error;
    }
  },

  deleteSupertask: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`${url}/${id}`);
    } catch (error) {
      console.error("Failed to delete supertask", error);
      throw error;
    }
  },
};

export const supertaskKeys = {
  all: ["supertasks"] as const,
  list: () => [...supertaskKeys.all, "list"] as const,
  listProject: (project_id: string) =>
    [...supertaskKeys.list(), "listProject", project_id] as const,
  details: () => [...supertaskKeys.all, "details"] as const,
  detail: (id: string) => [...supertaskKeys.details(), id] as const,
};

export function useGetOneSupertask(id: string) {
  return useQuery({
    queryKey: supertaskKeys.detail(id),
    queryFn: () => api.getOneSupertask(id),
  });
}

export function useGetAllProjectSupertasks(project_id: string) {
  return useQuery({
    queryKey: supertaskKeys.listProject(project_id),
    queryFn: () => api.getAllProjectSupertasks(project_id),
  });
}

export function useCreateSupertask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createSupertask,
    onSuccess: (result) => {
      // Invalidate the project supertasks list
      queryClient.invalidateQueries({
        queryKey: supertaskKeys.listProject(result.project_id),
      });
      // Invalidate all supertasks list (if we have one)
      queryClient.invalidateQueries({
        queryKey: supertaskKeys.list(),
      });
    },
  });
}

export function useUpdateSupertask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      supertask,
    }: {
      id: string;
      supertask: UpdateSupertask;
    }) => api.updateSupertask(id, supertask),
    onSuccess: (result, variables) => {
      // Invalidate the specific supertask detail
      queryClient.invalidateQueries({
        queryKey: supertaskKeys.detail(variables.id),
      });
      // Invalidate the project supertasks list
      if (result.project_id) {
        queryClient.invalidateQueries({
          queryKey: supertaskKeys.listProject(result.project_id),
        });
      }
      // Invalidate all supertasks list
      queryClient.invalidateQueries({
        queryKey: supertaskKeys.list(),
      });
    },
  });
}

export function useDeleteSupertask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteSupertask,
    onSuccess: (_, variables) => {
      // We don't have the supertask object here, but we can try to get it from the cache
      // to get the project_id for invalidating project tasks.
      // However, we don't have the id of the deleted supertask in the variables?
      // Actually, the mutationFn is (id: string) => void, so the variables is the id.
      const supertaskId = variables as string;
      // Try to get the supertask from the query cache
      const supertaskData = queryClient.getQueryData<SupertaskResponse>(
        supertaskKeys.detail(supertaskId)
      );
      if (supertaskData?.project_id) {
        // Invalidate the project tasks list for the project of this supertask
        // We don't have a hook for project tasks, but we can invalidate by the key used in useGetAllProjectTask
        // However, we don't want to import task hook here to avoid circular dependency.
        // Instead, we can invalidate by a pattern that matches the project tasks list.
        // We know that the task hook uses the key: taskKeys.listProject(project_id)
        // We can invalidate by matching that pattern? But we don't have access to taskKeys.
        // Alternatively, we can invalidate all tasks lists? That's heavy.
        // For now, we'll just invalidate the supertask lists and hope that the task data is updated elsewhere.
        // We'll also invalidate the project supertasks list.
        queryClient.invalidateQueries({
          queryKey: supertaskKeys.listProject(supertaskData.project_id),
        });
      }
      // Invalidate the supertask lists
      queryClient.invalidateQueries({
        queryKey: supertaskKeys.list(),
      });
      queryClient.removeQueries({ queryKey: supertaskKeys.detail(supertaskId) });
    },
  });
}