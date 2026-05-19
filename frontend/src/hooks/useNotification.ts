import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getStoredToken } from "@/services/api";

export type NotificationType = "info" | "warning" | "success" | "error";

export interface NotificationResponse {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationMarkRead {
  is_read: boolean;
}

interface MarkReadVariables {
  notifId: string | string[];
  payload?: NotificationMarkRead;
}

type MutationContext = { previous: NotificationResponse[] | undefined };

const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/notifications`
  : "http://127.0.0.1:8000/notifications";

async function fetchMyNotifications(): Promise<NotificationResponse[]> {
  const res = await fetch(`${BASE_URL}/`, {
    headers: { Authorization: `Bearer ${getStoredToken()}` },
  });
  if (!res.ok) throw new Error("Failed to fetch notifications");
  return res.json();
}

export function useGetMyNotifications() {
  return useQuery<NotificationResponse[], Error>({
    queryKey: ["notifications"],
    queryFn: fetchMyNotifications,
    enabled: !!getStoredToken(),
    staleTime: 1000 * 30,
    refetchOnWindowFocus: false,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, MarkReadVariables, MutationContext>({
    mutationFn: async ({ notifId, payload = { is_read: true } }) => {
      const ids = Array.isArray(notifId) ? notifId : [notifId];

      await Promise.all(
        ids.map((id) =>
          fetch(`${BASE_URL}/${id}/read`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${getStoredToken()}`,
            },
            body: JSON.stringify(payload),
          }).then((res) => {
            if (!res.ok) {
              if (res.status === 404)
                throw new Error(`Notification ${id} not found`);
              throw new Error(`Failed to mark notification ${id} as read`);
            }
          }),
        ),
      );
    },

    onMutate: async ({ notifId }): Promise<MutationContext> => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });

      const previous = queryClient.getQueryData<NotificationResponse[]>([
        "notifications",
      ]);

      const ids = Array.isArray(notifId) ? notifId : [notifId];
      const idSet = new Set(ids);

      queryClient.setQueryData<NotificationResponse[]>(
        ["notifications"],
        (old) =>
          old
            ? old.map((n) => (idSet.has(n.id) ? { ...n, is_read: true } : n))
            : [],
      );

      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["notifications"], context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
