import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import axios from "axios";
import apiClient from "@/services/apiClient";
import type {
  AssignedReviewerCreate,
  AssignedReviewerUpdate,
  AssignedReviewerResponse,
} from "@/types/assignedReviewer";

const url = "/assigned_reviewer";

const api = {
  getOneAssignedReviewer: async (id: string): Promise<AssignedReviewerResponse> => {
    try {
      const response = await apiClient.get(`${url}/${id}`);
      return response.data;
    } catch (error) {
      console.error("Failed to get assigned reviewer", error);
      throw error;
    }
  },

  getAllAssignedReviewers: async (): Promise<AssignedReviewerResponse[]> => {
    try {
      const response = await apiClient.get(url);
      return response.data;
    } catch (error) {
      console.error("Failed to get assigned reviewers", error);
      throw error;
    }
  },

  getTaskReviewers: async (taskId: string): Promise<AssignedReviewerResponse[]> => {
    try {
      const response = await apiClient.get(`${url}/task/${taskId}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return [];
      }
      console.error("Failed to fetch task reviewers", error);
      throw error;
    }
  },

  getMemberReviewers: async (memberId: string): Promise<AssignedReviewerResponse[]> => {
    try {
      const response = await apiClient.get(`${url}/member/${memberId}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return [];
      }
      console.error("Failed to fetch member reviewers", error);
      throw error;
    }
  },

  create: async (assignedReviewer: AssignedReviewerCreate): Promise<AssignedReviewerResponse> => {
    try {
      const response = await apiClient.post(url, assignedReviewer);
      return response.data;
    } catch (error) {
      console.error("Failed to create assigned reviewer", error);
      throw error;
    }
  },

  update: async (
    id: string,
    assignedReviewer: AssignedReviewerUpdate,
  ): Promise<AssignedReviewerResponse> => {
    try {
      const response = await apiClient.patch(`${url}/${id}`, assignedReviewer);
      return response.data;
    } catch (error) {
      console.error("Failed to update assigned reviewer", error);
      throw error;
    }
  },

  delete: async (id: string): Promise<string> => {
    try {
      const response = await apiClient.delete(`${url}/${id}`);
      return response.data;
    } catch (error) {
      console.error("Failed to delete assigned reviewer", error);
      throw error;
    }
  },
};

export const assignedReviewerKeys = {
  all: ["assignedReviewers"] as const,
  list: () => [...assignedReviewerKeys.all, "list"] as const,
  details: () => [...assignedReviewerKeys.all, "details"] as const,
  detail: (id: string) => [...assignedReviewerKeys.details(), id] as const,
  taskList: (taskId: string) => [...assignedReviewerKeys.all, "taskList", taskId] as const,
  memberList: (memberId: string) => [...assignedReviewerKeys.all, "memberList", memberId] as const,
};

export function useGetOneAssignedReviewer(id: string) {
  return useQuery({
    queryKey: assignedReviewerKeys.detail(id),
    queryFn: () => api.getOneAssignedReviewer(id),
  });
}

export function useGetAllAssignedReviewers() {
  return useQuery({
    queryKey: assignedReviewerKeys.list(),
    queryFn: api.getAllAssignedReviewers,
  });
}

export function useGetTaskReviewers(taskId: string) {
  return useQuery({
    queryKey: assignedReviewerKeys.taskList(taskId),
    queryFn: () => api.getTaskReviewers(taskId),
  });
}

export function useGetMemberReviewers(memberId: string) {
  return useQuery({
    queryKey: assignedReviewerKeys.memberList(memberId),
    queryFn: () => api.getMemberReviewers(memberId),
  });
}

export function useCreateAssignedReviewer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assignedReviewerKeys.all });
    },
  });
}

export function useUpdateAssignedReviewer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      assignedReviewer,
    }: {
      id: string;
      assignedReviewer: AssignedReviewerUpdate;
    }) => api.update(id, assignedReviewer),
    onSuccess: (_) => {
      queryClient.invalidateQueries({ queryKey: assignedReviewerKeys.all });
    },
  });
}

export function useDeleteAssignedReviewer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assignedReviewerKeys.all });
    },
  });
}