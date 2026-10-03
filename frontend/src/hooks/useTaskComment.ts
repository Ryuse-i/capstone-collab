import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/services/apiClient";
import type {
  CreateTaskComment,
  UpdateTaskComment,
  TaskCommentResponse,
} from "@/types/taskComment";

const url = "/task_comments";

const api = {
  getOneTaskComment: async (task_comment_id: string): Promise<TaskCommentResponse> => {
    try {
      const response = await apiClient.get<TaskCommentResponse>(`${url}/${task_comment_id}`);
      return response.data;
    } catch (error) {
      console.error("Failed to get task comment", error);
      throw error;
    }
  },

  getAllTaskComments: async (): Promise<TaskCommentResponse[]> => {
    try {
      const response = await apiClient.get<TaskCommentResponse[]>(url);
      return response.data;
    } catch (error) {
      console.error("Failed to get all task comments", error);
      throw error;
    }
  },

  getTaskCommentsByTask: async (taskId: string): Promise<TaskCommentResponse[]> => {
    try {
      const response = await apiClient.get<TaskCommentResponse[]>(url, {
        params: { task_id: taskId }
      });
      return response.data;
    } catch (error) {
      console.error("Failed to get task comments by task", error);
      throw error;
    }
  },

  createTaskComment: async (task_comment: CreateTaskComment): Promise<TaskCommentResponse> => {
    try {
      const response = await apiClient.post<TaskCommentResponse>(url, task_comment);
      return response.data;
    } catch (error) {
      console.error("Failed to create task comment", error);
      throw error;
    }
  },

  updateTaskComment: async (id: string, task_comment: UpdateTaskComment): Promise<TaskCommentResponse> => {
    try {
      const response = await apiClient.patch<TaskCommentResponse>(
        `${url}/${id}`,
        task_comment,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to update task comment", error);
      throw error;
    }
  },

  deleteTaskComment: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`${url}/${id}`);
    } catch (error) {
      console.error("Failed to delete task comment", error);
      throw error;
    }
  },
};

export const taskCommentKeys = {
  all: ["taskComments"] as const,
  list: () => [...taskCommentKeys.all, "list"] as const,
  details: () => [...taskCommentKeys.all, "details"] as const,
  detail: (id: string) => [...taskCommentKeys.details(), id] as const,
  listByTask: (taskId: string) => [...taskCommentKeys.all, "listByTask", taskId] as const,
};

export function useGetOneTaskComment(id: string) {
  return useQuery({
    queryKey: taskCommentKeys.detail(id),
    queryFn: () => api.getOneTaskComment(id),
  });
}

export function useGetAllTaskComments() {
  return useQuery({
    queryKey: taskCommentKeys.list(),
    queryFn: api.getAllTaskComments,
  });
}

export function useGetTaskCommentsByTask(taskId: string) {
  return useQuery({
    queryKey: taskCommentKeys.listByTask(taskId),
    queryFn: () => api.getTaskCommentsByTask(taskId),
    enabled: !!taskId,
  });
}

export function useCreateTaskComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createTaskComment,
    onSuccess: (data) => {
      // Invalidate task comment lists
      queryClient.invalidateQueries({ queryKey: taskCommentKeys.list() });
      // Invalidate task-specific comment lists
      queryClient.invalidateQueries({ queryKey: taskCommentKeys.listByTask(data.task_id) });
    },
  });
}

export function useUpdateTaskComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, task_comment }: { id: string; task_comment: UpdateTaskComment }) =>
      api.updateTaskComment(id, task_comment),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: taskCommentKeys.list() });
      queryClient.invalidateQueries({
        queryKey: taskCommentKeys.detail(data.id)
      });
      // Invalidate task-specific comment lists
      queryClient.invalidateQueries({ queryKey: taskCommentKeys.listByTask(data.task_id) });
    },
  });
}

export function useDeleteTaskComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => api.deleteTaskComment(id),
    onSuccess: (_, variables: { id: string; taskId?: string }) => {
      queryClient.invalidateQueries({ queryKey: taskCommentKeys.list() });
      queryClient.removeQueries({ queryKey: taskCommentKeys.detail(variables.id) });
      // Invalidate task-specific comment lists if taskId is provided
      if (variables.taskId) {
        queryClient.invalidateQueries({ queryKey: taskCommentKeys.listByTask(variables.taskId) });
      }
    },
  });
}