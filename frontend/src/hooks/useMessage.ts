import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  MessageResponse,
  CreateMessage,
  UpdateMessage,
} from "@/types/message";
import apiClient from "@/services/apiClient";

const url = "/messages";

const api = {
  getProjectMessages: async (
    project_id: string,
    before?: string,
  ): Promise<MessageResponse[]> => {
    try {
      const response = await apiClient.get<MessageResponse[]>(url, {
        params: before ? { project_id, before } : { project_id },
      });
      return response.data;
    } catch (error) {
      console.error("Failed to fetch messages", error);
      throw error;
    }
  },

  send: async (message: CreateMessage): Promise<MessageResponse> => {
    try {
      const response = await apiClient.post<MessageResponse>(url, message);
      return response.data;
    } catch (error) {
      console.error("Failed to send message", error);
      throw error;
    }
  },

  update: async (
    message_id: string,
    message: UpdateMessage,
  ): Promise<MessageResponse> => {
    try {
      const response = await apiClient.patch<MessageResponse>(
        `${url}/${message_id}`,
        message,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to update message", error);
      throw error;
    }
  },

  delete: async (message_id: string): Promise<void> => {
    try {
      await apiClient.delete(`${url}/${message_id}`);
    } catch (error) {
      console.error("Failed to delete message", error);
      throw error;
    }
  },
};

export const messageKeys = {
  all: ["messages"] as const,
  byProject: (project_id: string) =>
    [...messageKeys.all, project_id] as const,
};

export function useGetProjectMessages(project_id: string) {
  return useQuery({
    queryKey: messageKeys.byProject(project_id),
    queryFn: () => api.getProjectMessages(project_id),
    enabled: !!project_id,
    refetchInterval: 4000,
  });
}

export function useSendMessage(project_id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => api.send({ project_id, content }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: messageKeys.byProject(project_id),
      });
    },
  });
}

export function useUpdateMessage(project_id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      message_id,
      message,
    }: {
      message_id: string;
      message: UpdateMessage;
    }) => api.update(message_id, message),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: messageKeys.byProject(project_id),
      });
    },
  });
}

export function useDeleteMessage(project_id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (message_id: string) => api.delete(message_id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: messageKeys.byProject(project_id),
      });
    },
  });
}
