import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import axios from "axios";
import type {
  ProjectBase,
  ProjectWithSnapshot,
  ProjectResponse,
  CreateProject,
  UpdateProject,
} from "@/types/project";
import apiClient from "@/services/apiClient";

// Create apihelper for 404 and other error handler that would be reusable

const url = "/projects";

const api = {
  getCurentProjectWithSnapshot: async (
    id: string,
  ): Promise<ProjectWithSnapshot | null> => {
    try {
      const response = await apiClient.get(`${url}/user/${id}/with-snapshot`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      console.error("Failed to fetch current project", error);
      throw error;
    }
  },

  getOneProject: async (id: string): Promise<ProjectBase> => {
    try {
      const response = await apiClient.get(`${url}/${id}`);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch project", error);
      throw error;
    }
  },

  getAll: async (): Promise<ProjectBase[]> => {
    try {
      const response = await apiClient.get(url);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch projects", error);
      throw error;
    }
  },

  getOneProjectWithSpanshot: async (
    id: string,
  ): Promise<ProjectWithSnapshot> => {
    try {
      const response = await apiClient.get(`${url}/snapshots/${id}`);
      return response.data;
    } catch (error) {
      console.error("Failed to get snapshots", error);
      throw error;
    }
  },

  getProjectsWithSnapshot: async (): Promise<ProjectWithSnapshot[]> => {
    try {
      const response = await apiClient.get(`${url}/snapshots`);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch projects", error);
      throw error;
    }
  },

  create: async (project: CreateProject): Promise<ProjectResponse> => {
    try {
      const response = await apiClient.post(url, project);
      return response.data;
    } catch (error) {
      console.error("Failed to create project", error);
      throw error;
    }
  },

  update: async (id: string, project: UpdateProject): Promise<ProjectBase> => {
    try {
      const response = await apiClient.patch(`${url}/${id}`, project);
      return response.data;
    } catch (error) {
      console.error("Failed to update project", error);
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`${url}/${id}`);
    } catch (error) {
      console.error("Failed to delete project", error);
      throw error;
    }
  },
};

export const projectKeys = {
  all: ["projects"] as const,
  list: () => [...projectKeys.all, "list"] as const,
  listSnapshot: () => [...projectKeys.all, "listSnapshot"] as const,
  details: () => [...projectKeys.all, "detail"] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
  detailSnapshot: (id: string) =>
    [...projectKeys.details(), "detailSnapshot", id] as const,
};

//Get current project of user
export function useGetCurrentProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detailSnapshot(id),
    queryFn: () => api.getCurentProjectWithSnapshot(id),
    retry: false,
  });
}

// get all projects
export function useGetProjects() {
  return useQuery({
    queryKey: projectKeys.list(),
    queryFn: api.getAll,
  });
}

// get on project
export function useGetOneProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => api.getOneProject(id),
    enabled: !!id, //make sure id exist
  });
}

// need id to execute
export function useGetOneProjectWithSpanshot(id: string) {
  return useQuery({
    queryKey: projectKeys.detailSnapshot(id),
    queryFn: () => api.getOneProjectWithSpanshot(id),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.list() });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, project }: { id: string; project: UpdateProject }) =>
      api.update(id, project),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: projectKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: projectKeys.list() });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.delete,
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: projectKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.list() });
    },
  });
}
