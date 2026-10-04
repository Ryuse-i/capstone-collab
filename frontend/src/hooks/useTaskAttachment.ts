import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import apiClient from "@/services/apiClient";
import type {
  TaskAttachmentResponse,
  FileUrlResponse,
} from "@/types/task_attachment";

const url = "/task_attachments";

const api = {
  getByTask: async (task_id: string): Promise<TaskAttachmentResponse[]> => {
    try {
      const response = await apiClient.get<TaskAttachmentResponse[]>(
        `${url}/tasks/${task_id}`,
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return [];
      }
      console.error("Failed to get task attachments", error);
      throw error;
    }
  },

  upload: async (
    task_id: string,
    file: File,
  ): Promise<TaskAttachmentResponse> => {
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await apiClient.post<TaskAttachmentResponse>(
        `${url}/tasks/${task_id}`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      return response.data;
    } catch (error) {
      console.error("Failed to upload attachment", error);
      throw error;
    }
  },

  getUrl: async (attachment_id: string): Promise<string> => {
    try {
      const response = await apiClient.get<FileUrlResponse>(
        `${url}/${attachment_id}/url`,
      );
      return response.data.url;
    } catch (error) {
      console.error("Failed to get attachment url", error);
      throw error;
    }
  },

  delete: async (attachment_id: string): Promise<void> => {
    try {
      await apiClient.delete(`${url}/${attachment_id}`);
    } catch (error) {
      console.error("Failed to delete attachment", error);
      throw error;
    }
  },
};

export const taskAttachmentKeys = {
  all: ["task-attachments"] as const,
  byTask: (task_id: string) =>
    [...taskAttachmentKeys.all, "byTask", task_id] as const,
};

export function useGetTaskAttachments(task_id: string) {
  return useQuery({
    queryKey: taskAttachmentKeys.byTask(task_id),
    queryFn: () => api.getByTask(task_id),
    enabled: !!task_id,
  });
}

export function useUploadTaskAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ task_id, file }: { task_id: string; file: File }) =>
      api.upload(task_id, file),
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: taskAttachmentKeys.byTask(result.task_id),
      });
    },
  });
}

export function useDeleteTaskAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      attachment_id,
    }: {
      attachment_id: string;
      task_id: string;
    }) => api.delete(attachment_id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: taskAttachmentKeys.byTask(variables.task_id),
      });
    },
  });
}

// Signed URLs expire, so fetch on demand (on click) instead of caching in a query.
export function useGetAttachmentUrl() {
  return useMutation({
    mutationFn: (attachment_id: string) => api.getUrl(attachment_id),
  });
}
