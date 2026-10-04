import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/services/apiClient";
import type {
  CreateTaskLink,
  UpdateTaskLink,
  TaskLinkResponse,
} from "@/types/task_link";

const url = "/task_links";

const api = {
  getByTask: async (task_id: string): Promise<TaskLinkResponse[]> => {
    try {
      const response = await apiClient.get<TaskLinkResponse[]>(
        `${url}/tasks/${task_id}`,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to get task links", error);
      throw error;
    }
  },

  create: async (
    task_id: string,
    link: CreateTaskLink,
  ): Promise<TaskLinkResponse> => {
    try {
      const response = await apiClient.post<TaskLinkResponse>(
        `${url}/tasks/${task_id}`,
        link,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to add task link", error);
      throw error;
    }
  },

  update: async (
    link_id: string,
    link: UpdateTaskLink,
  ): Promise<TaskLinkResponse> => {
    try {
      const response = await apiClient.patch<TaskLinkResponse>(
        `${url}/${link_id}`,
        link,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to update task link", error);
      throw error;
    }
  },

  delete: async (link_id: string): Promise<void> => {
    try {
      await apiClient.delete(`${url}/${link_id}`);
    } catch (error) {
      console.error("Failed to delete task link", error);
      throw error;
    }
  },
};

export const taskLinkKeys = {
  all: ["task-links"] as const,
  byTask: (task_id: string) =>
    [...taskLinkKeys.all, "byTask", task_id] as const,
};

export function useGetTaskLinks(task_id: string) {
  return useQuery({
    queryKey: taskLinkKeys.byTask(task_id),
    queryFn: () => api.getByTask(task_id),
    enabled: !!task_id,
  });
}

export function useCreateTaskLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ task_id, link }: { task_id: string; link: CreateTaskLink }) =>
      api.create(task_id, link),
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: taskLinkKeys.byTask(result.task_id),
      });
    },
  });
}

export function useUpdateTaskLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ link_id, link }: { link_id: string; link: UpdateTaskLink }) =>
      api.update(link_id, link),
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: taskLinkKeys.byTask(result.task_id),
      });
    },
  });
}

export function useDeleteTaskLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ link_id }: { link_id: string; task_id: string }) =>
      api.delete(link_id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: taskLinkKeys.byTask(variables.task_id),
      });
    },
  });
}