import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/services/apiClient";
import type {
  CreateRecommendation,
  UpdateRecommendation,
  RecommendationResponse,
} from "@/types/redistributionRecommendation";

// Must match the prefix the recommendation router is mounted under in the backend
const url = "/redistribution_recommendation";

const api = {
  getAllRecommendations: async (): Promise<RecommendationResponse[]> => {
    try {
      const response = await apiClient.get<RecommendationResponse[]>(`${url}/`);
      return response.data;
    } catch (error) {
      console.error("Failed to get all recommendations", error);
      throw error;
    }
  },

  getOneRecommendation: async (
    id: number,
  ): Promise<RecommendationResponse> => {
    try {
      const response = await apiClient.get<RecommendationResponse>(
        `${url}/${id}`,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to get recommendation", error);
      throw error;
    }
  },

  // Saved recommendations for one project, best rank first
  getProjectRecommendations: async (
    project_id: string,
  ): Promise<RecommendationResponse[]> => {
    try {
      const response = await apiClient.get<RecommendationResponse[]>(
        `${url}/project/${project_id}`,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to get project recommendations", error);
      throw error;
    }
  },

  // Recomputes and REPLACES the project's saved recommendations.
  // Returns [] when nobody is overloaded or nothing is viable.
  generateRecommendations: async (
    project_id: string,
  ): Promise<RecommendationResponse[]> => {
    try {
      const response = await apiClient.post<RecommendationResponse[]>(
        `${url}/project/${project_id}/generate`,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to generate recommendations", error);
      throw error;
    }
  },

  createRecommendation: async (
    recommendation: CreateRecommendation,
  ): Promise<RecommendationResponse> => {
    try {
      const response = await apiClient.post<RecommendationResponse>(
        `${url}/`,
        recommendation,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to create recommendation", error);
      throw error;
    }
  },

  updateRecommendation: async (
    id: number,
    recommendation: UpdateRecommendation,
  ): Promise<RecommendationResponse> => {
    try {
      const response = await apiClient.patch<RecommendationResponse>(
        `${url}/${id}`,
        recommendation,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to update recommendation", error);
      throw error;
    }
  },

  deleteRecommendation: async (id: number): Promise<void> => {
    try {
      await apiClient.delete(`${url}/${id}`);
    } catch (error) {
      console.error("Failed to delete recommendation", error);
      throw error;
    }
  },
};

export const recommendationKeys = {
  all: ["recommendations"] as const,
  list: () => [...recommendationKeys.all, "list"] as const,
  details: () => [...recommendationKeys.all, "details"] as const,
  detail: (id: number) => [...recommendationKeys.details(), id] as const,
  byProjectAll: () => [...recommendationKeys.all, "project"] as const,
  byProject: (project_id: string) =>
    [...recommendationKeys.byProjectAll(), project_id] as const,
};

export function useGetAllRecommendations() {
  return useQuery({
    queryKey: recommendationKeys.list(),
    queryFn: api.getAllRecommendations,
  });
}

export function useGetOneRecommendation(id: number) {
  return useQuery({
    queryKey: recommendationKeys.detail(id),
    queryFn: () => api.getOneRecommendation(id),
    enabled: id != null,
  });
}

export function useGetProjectRecommendations(project_id: string) {
  return useQuery({
    queryKey: recommendationKeys.byProject(project_id),
    queryFn: () => api.getProjectRecommendations(project_id),
    enabled: !!project_id,
  });
}

// Usage: const { mutate } = useGenerateRecommendations(); mutate(projectId)
export function useGenerateRecommendations() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (project_id: string) => api.generateRecommendations(project_id),
    onSuccess: (result, project_id) => {
      // The server replaced the project's rows, so show the new list right away
      queryClient.setQueryData(recommendationKeys.byProject(project_id), result);
      queryClient.invalidateQueries({ queryKey: recommendationKeys.list() });
      queryClient.invalidateQueries({ queryKey: recommendationKeys.details() });
    },
  });
}

export function useCreateRecommendation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createRecommendation,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: recommendationKeys.list() });
      queryClient.invalidateQueries({
        queryKey: recommendationKeys.byProject(result.project_id),
      });
    },
  });
}

export function useUpdateRecommendation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      recommendation,
    }: {
      id: number;
      recommendation: UpdateRecommendation;
    }) => api.updateRecommendation(id, recommendation),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: recommendationKeys.list() });
      queryClient.invalidateQueries({
        queryKey: recommendationKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: recommendationKeys.byProject(result.project_id),
      });
    },
  });
}

export function useDeleteRecommendation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteRecommendation,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: recommendationKeys.list() });
      queryClient.removeQueries({ queryKey: recommendationKeys.detail(id) });
      // The delete response has no project_id, so refresh every project's list
      queryClient.invalidateQueries({
        queryKey: recommendationKeys.byProjectAll(),
      });
    },
  });
}