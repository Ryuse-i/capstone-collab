import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/services/apiClient";
import type {
  CreateTaskComment,
  UpdateTaskComment,
  TaskCommentResponse,
  TaskCommentResponseWithAuthor,
} from "@/types/taskComment";

const url = "/task_comments";

const api = {
  getOneTaskComment: async (
    task_comment_id: string,
  ): Promise<TaskCommentResponseWithAuthor> => {
    try {
      const response = await apiClient.get<TaskCommentResponseWithAuthor>(
        `${url}/${task_comment_id}`,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to get task comment", error);
      throw error;
    }
  },

  getAllTaskComments: async (): Promise<TaskCommentResponseWithAuthor[]> => {
    try {
      const response = await apiClient.get<TaskCommentResponseWithAuthor[]>(url);
      return response.data;
    } catch (error) {
      console.error("Failed to get all task comments", error);
      throw error;
    }
  },

  getTaskCommentsByTask: async (
    taskId: string,
  ): Promise<TaskCommentResponseWithAuthor[]> => {
    try {
      const response = await apiClient.get<TaskCommentResponseWithAuthor[]>(url, {
        params: { task_id: taskId },
      });
      return response.data;
    } catch (error) {
      console.error("Failed to get task comments by task", error);
      throw error;
    }
  },

  createTaskComment: async (
    task_comment: CreateTaskComment,
  ): Promise<TaskCommentResponse> => {
    try {
      const response = await apiClient.post<TaskCommentResponse>(
        url,
        task_comment,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to create task comment", error);
      throw error;
    }
  },

  updateTaskComment: async (
    id: string,
    task_comment: UpdateTaskComment,
  ): Promise<TaskCommentResponse> => {
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
  listByTask: (taskId: string) =>
    [...taskCommentKeys.list(), "listByTask", taskId] as const,
  details: () => [...taskCommentKeys.all, "details"] as const,
  detail: (id: string) => [...taskCommentKeys.details(), id] as const,
};

export function useGetOneTaskComment(id: string) {
  return useQuery({
    queryKey: taskCommentKeys.detail(id),
    queryFn: () => api.getOneTaskComment(id),
    enabled: !!id,
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
    onSuccess: (result) => {
      // listByTask is nested under list(), so this covers both the global
      // list and the per-task list.
      queryClient.invalidateQueries({ queryKey: taskCommentKeys.list() });
      queryClient.invalidateQueries({
        queryKey: taskCommentKeys.listByTask(String(result.task_id)),
      });
    },
  });
}

export function useUpdateTaskComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      task_comment,
    }: {
      id: string;
      task_comment: UpdateTaskComment;
    }) => api.updateTaskComment(id, task_comment),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: taskCommentKeys.list() });
      queryClient.invalidateQueries({
        queryKey: taskCommentKeys.detail(variables.id),
      });
      // Invalidate the comment list for the task this comment belongs to
      if (result.task_id) {
        queryClient.invalidateQueries({
          queryKey: taskCommentKeys.listByTask(String(result.task_id)),
        });
      }
    },
  });
}

export function useDeleteTaskComment() {
  const queryClient = useQueryClient();
  return useMutation({
    // taskId is optional and only used to refresh that task's comment list;
    // the API call itself only needs the comment id.
    mutationFn: ({ id }: { id: string; taskId?: string }) =>
      api.deleteTaskComment(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: taskCommentKeys.list() });
      queryClient.removeQueries({
        queryKey: taskCommentKeys.detail(variables.id),
      });
      if (variables.taskId) {
        queryClient.invalidateQueries({
          queryKey: taskCommentKeys.listByTask(variables.taskId),
        });
      }
    },
  });
}