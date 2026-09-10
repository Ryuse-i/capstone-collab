import React from "react";
import { Loader2Icon, LucideBellRing } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  useGetUserNotifications,
  useMarkAsRead,
} from "@/hooks/useNotification";
import type { NotificationResponse } from "@/types/notification";
import { getMockNotifications } from "./notificationFixtures";
import NotificationDialogContent from "./NotificationDialogContent";
import NotificationCard, {
  type NotificationCardType,
} from "./NotificationCard";

interface NotificationCenterProps {
  userId?: string;
}

export default function NotificationCenter({
  userId,
}: NotificationCenterProps) {
  const [selectedNotification, setSelectedNotification] =
    React.useState<NotificationResponse | null>(null);
  const [dismissedIds, setDismissedIds] = React.useState<Set<string>>(
    () => new Set(),
  );
  const { data, isLoading: notificationLoading } = useGetUserNotifications(
    userId ?? "",
  );
  const { mutate: markAsRead } = useMarkAsRead();

  const notifications: NotificationResponse[] = [
    ...(import.meta.env.DEV ? getMockNotifications(userId) : []),
    ...(data ?? []),
  ];
  const visibleNotifications = notifications.filter(
    (item) => !dismissedIds.has(item.id),
  );
  const hasUnread = visibleNotifications.some((item) => !item.is_read);

  function getNotificationCardType(
    notification: NotificationResponse,
  ): NotificationCardType {
    const searchableText = `${notification.title} ${notification.body}`.toLowerCase();

    if (
      searchableText.includes("error") ||
      searchableText.includes("fail")
    ) {
      return "error";
    }
    if (
      searchableText.includes("complete") ||
      searchableText.includes("success")
    ) {
      return "task_completed";
    }
    if (
      notification.type === "project_invitation" ||
      searchableText.includes("need") ||
      searchableText.includes("attention")
    ) {
      return "needs_info";
    }
    return "context_updated";
  }

  function dismissNotification(id: string) {
    setDismissedIds((current) => new Set(current).add(id));
  }

  function formatTimestamp(createdAt: string) {
    return new Date(createdAt).toLocaleString([], {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function handleNotificationClick(item: NotificationResponse) {
    setSelectedNotification(item);
    if (!item.is_read) markAsRead(item.id);
  }

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" className="relative">
            <LucideBellRing className="h-4 w-4" />
            {hasUnread && (
              <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-background" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-[min(26rem,calc(100vw-2rem))] border-0 bg-transparent p-0 shadow-none ring-0 custom-scrollbar"
        >
          <PopoverHeader className="sr-only">
            <PopoverTitle>Notifications</PopoverTitle>
            <PopoverDescription>Recent notifications</PopoverDescription>
          </PopoverHeader>
          <div className="max-h-[calc(100vh-5rem)] space-y-3 overflow-y-auto rounded-xl p-1">
            {notificationLoading ? (
              <div className="rounded-xl border border-(--notification-card-border) bg-(--notification-card) p-6 text-xs text-(--notification-card-muted) shadow-(--notification-card-shadow)">
                <div className="flex items-center justify-center gap-2">
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                  Loading notifications...
                </div>
              </div>
            ) : visibleNotifications.length === 0 ? (
              <div className="rounded-xl border border-(--notification-card-border) bg-(--notification-card) p-6 text-center text-xs text-(--notification-card-muted) shadow-(--notification-card-shadow)">
                You currently have no notifications
              </div>
            ) : (
              visibleNotifications.map((item) => (
                <NotificationCard
                  key={item.id}
                  type={getNotificationCardType(item)}
                  title={item.title}
                  description={item.body}
                  timestamp={formatTimestamp(item.created_at)}
                  onDismiss={() => dismissNotification(item.id)}
                  actions={[
                    {
                      label: "View details",
                      onClick: () => handleNotificationClick(item),
                    },
                    {
                      label: item.is_read ? "Dismiss" : "Mark as read",
                      onClick: () => {
                        if (item.is_read) {
                          dismissNotification(item.id);
                        } else {
                          markAsRead(item.id);
                        }
                      },
                    },
                  ]}
                />
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>

      <Dialog
        open={!!selectedNotification}
        onOpenChange={(isOpen) => {
          if (!isOpen) setSelectedNotification(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          {selectedNotification && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <DialogTitle>{selectedNotification.title}</DialogTitle>
                  <Badge
                    variant={
                      selectedNotification.is_read ? "secondary" : "default"
                    }
                  >
                    {selectedNotification.is_read ? "Read" : "Unread"}
                  </Badge>
                </div>
                <DialogDescription className="text-xs">
                  {new Date(selectedNotification.created_at).toLocaleString(
                    [],
                    {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    },
                  )}
                </DialogDescription>
              </DialogHeader>
              <NotificationDialogContent
                notification={selectedNotification}
                userId={userId}
                onClose={() => setSelectedNotification(null)}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
