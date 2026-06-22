import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import type {
  Project,
  ProjectResponseSnapshot,
  CreateProjectInput,
  UpdateProjectInput,
} from "@/types/project";
import apiClient from "@/services/apiClient";

const url = "/projects";

const api = {
  getOneProject: async (id: string): Promise<Project> => {
    try {
      const response = await apiClient.get(`${url}/${id}`);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch project", error);
      throw error;
    }
  },

  getAll: async (): Promise<Project[]> => {
    try {
      const response = await apiClient.get(url);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch projects", error);
      throw error;
    }
  },

  getSpanshot: async (id: string): Promise<ProjectResponseSnapshot[]> => {
    try {
      const response = await apiClient.get(`${url}/snapshots/${id}`);
      return response.data;
    } catch (error) {
      console.error("Failed to get snapshots", error);
      throw error;
    }
  },

  create: async (project: CreateProjectInput): Promise<Project> => {
    try {
      const response = await apiClient.post(url, project);
      return response.data;
    } catch (error) {
      console.error("Failed to create project", error);
      throw error;
    }
  },

  update: async (id: string, project: UpdateProjectInput): Promise<Project> => {
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
  details: () => [...projectKeys.all, "detail"] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
};

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
    mutationFn: ({
      id,
      project,
    }: {
      id: string;
      project: UpdateProjectInput;
    }) => api.update(id, project),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.list() });
      queryClient.invalidateQueries({
        queryKey: projectKeys.detail(variables.id),
      });
    },
  });
}
