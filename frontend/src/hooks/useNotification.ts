import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import axios from "axios";
import apiClient from "@/services/apiClient";

import type {
  NotificationCreate,
  NotificationResponse,
  NotificationUpdate,
} from "@/types/notification";

const url = "/notifications";

/* =========================================================
   API
========================================================= */

const api = {
  /* -------------------------------------------------------
     Get one notification
  ------------------------------------------------------- */
  getOneNotification: async (
    id: string,
  ): Promise<NotificationResponse> => {
    try {
      const response = await apiClient.get(
        `${url}/${id}`,
      );

      return response.data;
    } catch (error) {
      console.error(
        "Failed to get notification:",
        error,
      );

      throw error;
    }
  },

  /* -------------------------------------------------------
     Get all notifications
  ------------------------------------------------------- */
  getAllNotifications: async (): Promise<
    NotificationResponse[]
  > => {
    try {
      const response = await apiClient.get(url);

      return response.data;
    } catch (error) {
      console.error(
        "Failed to get notifications:",
        error,
      );

      throw error;
    }
  },

  /* -------------------------------------------------------
     Get notifications for a specific user
  ------------------------------------------------------- */
  getUserNotifications: async (
    userId: string,
  ): Promise<NotificationResponse[]> => {
    try {
      const response = await apiClient.get(
        `${url}/${userId}`,
      );

      return response.data ?? [];
    } catch (error) {
      /*
       * A user with no notifications may return 404
       * depending on your backend implementation.
       */
      if (
        axios.isAxiosError(error) &&
        error.response?.status === 404
      ) {
        return [];
      }

      console.error(
        "Failed to fetch user notifications:",
        error,
      );

      throw error;
    }
  },

  /* -------------------------------------------------------
     Create notification
  ------------------------------------------------------- */
  createNotification: async (
    notification: NotificationCreate,
  ): Promise<NotificationResponse> => {
    try {
      const response = await apiClient.post(
        url,
        notification,
      );

      return response.data;
    } catch (error) {
      console.error(
        "Failed to create notification:",
        error,
      );

      throw error;
    }
  },

  /* -------------------------------------------------------
     Update notification
  ------------------------------------------------------- */
  updateNotification: async (
    id: string,
    notification: NotificationUpdate,
  ): Promise<NotificationResponse> => {
    try {
      const response = await apiClient.patch(
        `${url}/${id}`,
        notification,
      );

      return response.data;
    } catch (error) {
      console.error(
        "Failed to update notification:",
        error,
      );

      throw error;
    }
  },

  /* -------------------------------------------------------
     Delete notification
  ------------------------------------------------------- */
  deleteNotification: async (
    id: string,
  ): Promise<string> => {
    try {
      const response = await apiClient.delete(
        `${url}/${id}`,
      );

      return response.data;
    } catch (error) {
      console.error(
        "Failed to delete notification:",
        error,
      );

      throw error;
    }
  },

  /* -------------------------------------------------------
     Mark notification as read
  ------------------------------------------------------- */
  markAsRead: async (
    id: string,
  ): Promise<NotificationResponse> => {
    try {
      const response = await apiClient.patch(
        `${url}/mark_as_read/${id}`,
      );

      return response.data;
    } catch (error) {
      console.error(
        "Failed to mark notification as read:",
        error,
      );

      throw error;
    }
  },
};

/* =========================================================
   QUERY KEYS
========================================================= */

export const notificationKeys = {
  all: ["notifications"] as const,

  lists: () =>
    [...notificationKeys.all, "list"] as const,

  userList: (userId: string) =>
    [
      ...notificationKeys.all,
      "userList",
      userId,
    ] as const,

  details: () =>
    [...notificationKeys.all, "details"] as const,

  detail: (id: string) =>
    [
      ...notificationKeys.details(),
      id,
    ] as const,
};

/*
 * Keep the old name available in case another component
 * already imports `notificatonKeys`.
 */
export const notificatonKeys = notificationKeys;

/* =========================================================
   GET ONE NOTIFICATION
========================================================= */

export function useGetOneNotification(
  id: string,
) {
  return useQuery({
    queryKey: notificationKeys.detail(id),

    queryFn: () =>
      api.getOneNotification(id),

    enabled: Boolean(id),

    staleTime: 30_000,
  });
}

/* =========================================================
   GET ALL NOTIFICATIONS
========================================================= */

export function useGetAllNotifications() {
  return useQuery({
    queryKey: notificationKeys.lists(),

    queryFn:
      api.getAllNotifications,

    staleTime: 30_000,
  });
}

/* =========================================================
   GET USER NOTIFICATIONS
========================================================= */

export function useGetUserNotifications(
  userId: string,
) {
  return useQuery({
    queryKey:
      notificationKeys.userList(userId),

    queryFn: () =>
      api.getUserNotifications(userId),

    enabled: Boolean(userId),

    staleTime: 30_000,
  });
}

/* =========================================================
   CREATE NOTIFICATION
========================================================= */

export function useNotification() {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn:
      api.createNotification,

    onSuccess: (newNotification) => {
      /*
       * Refresh all notifications.
       */
      queryClient.invalidateQueries({
        queryKey:
          notificationKeys.all,
      });

      /*
       * If the created notification belongs
       * to a specific user, refresh that user's list.
       */
      if (newNotification.user_id) {
        queryClient.invalidateQueries({
          queryKey:
            notificationKeys.userList(
              newNotification.user_id,
            ),
        });
      }
    },
  });
}

/* =========================================================
   UPDATE NOTIFICATION
========================================================= */

export function useUpdateNotification() {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      notification,
    }: {
      id: string;
      notification: NotificationUpdate;
    }) =>
      api.updateNotification(
        id,
        notification,
      ),

    onSuccess: (
      updatedNotification,
      variables,
    ) => {
      /*
       * Update the individual notification
       * immediately in the cache.
       */
      queryClient.setQueryData(
        notificationKeys.detail(
          variables.id,
        ),
        updatedNotification,
      );

      /*
       * Refresh notification lists.
       */
      queryClient.invalidateQueries({
        queryKey:
          notificationKeys.all,
      });

      /*
       * Refresh the specific user's list.
       */
      if (updatedNotification.user_id) {
        queryClient.invalidateQueries({
          queryKey:
            notificationKeys.userList(
              updatedNotification.user_id,
            ),
        });
      }
    },
  });
}

/* =========================================================
   DELETE NOTIFICATION
========================================================= */

export function useDeleteNotification() {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn:
      api.deleteNotification,

    onSuccess: (_, notificationId) => {
      /*
       * Remove individual notification
       * from the detail cache.
       */
      queryClient.removeQueries({
        queryKey:
          notificationKeys.detail(
            notificationId,
          ),
      });

      /*
       * Refresh notification lists.
       */
      queryClient.invalidateQueries({
        queryKey:
          notificationKeys.all,
      });
    },
  });
}

/* =========================================================
   MARK AS READ
========================================================= */

export function useMarkAsRead(
  userId?: string,
) {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn: (
      notificationId: string,
    ) =>
      api.markAsRead(
        notificationId,
      ),

    onSuccess: (
      updatedNotification,
      notificationId,
    ) => {
      /*
       * Update the individual notification
       * immediately.
       */
      queryClient.setQueryData(
        notificationKeys.detail(
          notificationId,
        ),
        updatedNotification,
      );

      /*
       * Update the notification in the
       * user's cached notification list.
       */
      if (userId) {
        queryClient.setQueryData<
          NotificationResponse[]
        >(
          notificationKeys.userList(
            userId,
          ),
          (currentNotifications) => {
            if (!currentNotifications) {
              return currentNotifications;
            }

            return currentNotifications.map(
              (notification) =>
                notification.id ===
                notificationId
                  ? {
                      ...notification,
                      ...updatedNotification,
                      is_read: true,
                    }
                  : notification,
            );
          },
        );

        /*
         * Also make sure the server data is
         * eventually refreshed.
         */
        queryClient.invalidateQueries({
          queryKey:
            notificationKeys.userList(
              userId,
            ),
        });
      }

      /*
       * Refresh the general notification list.
       */
      queryClient.invalidateQueries({
        queryKey:
          notificationKeys.lists(),
      });
    },
  });
}