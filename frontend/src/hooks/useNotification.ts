import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import axios from "axios";
import apiClient from "@/services/apiClient";
import type {
  NotificationCreate,
  NotificationUpdate,
  NotificationResponse,
} from "@/types/notification";

const url = "/notifications";

const api = {
  getOneNotification: async (id: string): Promise<NotificationResponse> => {
    try {
      const response = await apiClient.get(`${url}/${id}`);
      return response.data;
    } catch (error) {
      console.error("Failed to get notification", error);
      throw error;
    }
  },

  getAllNotifications: async (): Promise<NotificationResponse[]> => {
    try {
      const response = await apiClient.get(url);
      return response.data;
    } catch (error) {
      console.error("Failed to get notifications", error);
      throw error;
    }
  },

  getUserNotification: async (
    user_id: string,
  ): Promise<NotificationResponse[] | null> => {
    try {
      const response = await apiClient.get(`${url}/${user_id}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      console.error("Failed to fetch notification", error);
      throw error;
    }
  },

  create: async (
    notification: NotificationCreate,
  ): Promise<NotificationResponse> => {
    try {
      const response = await apiClient.post(url, notification);
      return response.data;
    } catch (error) {
      console.error("Failed to create notification", error);
      throw error;
    }
  },

  update: async (
    id: string,
    notification: NotificationUpdate,
  ): Promise<NotificationResponse> => {
    try {
      const response = await apiClient.patch(`${url}/${id}`, notification);
      return response.data;
    } catch (error) {
      console.error("Failed to update notification", error);
      throw error;
    }
  },

  delete: async (id: string): Promise<string> => {
    try {
      const response = await apiClient.delete(id);
      return response.data;
    } catch (error) {
      console.error("Failed to delete notification", error);
      throw error;
    }
  },
  markAdRead: async (id: string): Promise<NotificationResponse> => {
    try {
      const response = await apiClient.patch(`${url}/mark_as_read/${id}`);
      return response.data;
    } catch (error) {
      console.error("Failed to mark as read", error);
      throw error;
    }
  },
};

export const notificatonKeys = {
  all: ["notifications"] as const,
  list: () => [...notificatonKeys.all, "list"] as const,
  details: () => [...notificatonKeys.all, "details"] as const,
  detail: (id: string) => [...notificatonKeys.details(), id] as const,
};

export function useGetOneNotification(id: string) {
  return useQuery({
    queryKey: notificatonKeys.detail(id),
    queryFn: () => api.getOneNotification(id),
  });
}

export function useGetAllNotifications() {
  return useQuery({
    queryKey: notificatonKeys.list(),
    queryFn: api.getAllNotifications,
  });
}

export function useGetUserNotifications(id: string) {
  return useQuery({
    queryKey: notificatonKeys.list(),
    queryFn: () => api.getUserNotification(id),
  });
}

export function useNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificatonKeys.list() });
    },
  });
}

export function useUpdateNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      notification,
    }: {
      id: string;
      notification: NotificationUpdate;
    }) => api.update(id, notification),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: notificatonKeys.list() });
      queryClient.invalidateQueries({
        queryKey: notificatonKeys.detail(variables.id),
      });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificatonKeys.list() });
    },
  });
}

export function useMarkAsRead( ) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.markAdRead(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: notificatonKeys.list() });
      queryClient.invalidateQueries({queryKey: notificatonKeys.detail(variables)})
    },
  });
}
