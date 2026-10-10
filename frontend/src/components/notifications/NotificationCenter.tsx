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

import { useCurrentUser } from "@/hooks/useAuth";

import {
  useGetUserNotifications,
  useMarkAsRead,
} from "@/hooks/useNotification";

import type { NotificationResponse } from "@/types/notification";

import NotificationDialogContent from "./NotificationDialogContent";

import NotificationCard, {
  type NotificationCardType,
} from "./NotificationCard";

// Popover container with no outer box (no bg, border, ring, shadow, padding)
const POPOVER_CONTENT_CLASS =
  "w-[min(26rem,calc(100vw-2rem))] border-0 bg-transparent p-0 shadow-none ring-0";

export default function NotificationCenter() {
  const {
    data: user,
    isLoading: userLoading,
    isError: userError,
  } = useCurrentUser();

  const {
    data,
    isLoading: apiNotificationLoading,
    isError: notificationError,
  } = useGetUserNotifications(user?.id ?? "");

  const { mutate: markAsRead } = useMarkAsRead();

  // Controls the notification popover
  const [popoverOpen, setPopoverOpen] = React.useState(false);

  // Controls the notification details dialog (stores only the id so the
  // dialog always reflects the latest data from the query)
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  // Stores notifications cleared from the current UI session
  const [dismissedIds, setDismissedIds] = React.useState<Set<string>>(
    () => new Set(),
  );

  // Real notifications from the backend
  const notifications: NotificationResponse[] = data ?? [];

  // Derived from query data, so it updates after markAsRead / refetch
  const selectedNotification =
    notifications.find((n) => n.id === selectedId) ?? null;

  const visibleNotifications = notifications.filter(
    (item) => !dismissedIds.has(item.id),
  );

  const hasUnread = visibleNotifications.some((item) => !item.is_read);

  const notificationLoading = userLoading || apiNotificationLoading;

  /*
   * ============================
   * NOTIFICATION CARD TYPE
   * ============================
   */

  function getNotificationCardType(
    notification: NotificationResponse,
  ): NotificationCardType {
    const searchableText =
      `${notification.title} ${notification.body}`.toLowerCase();

    if (
      searchableText.includes("error") ||
      searchableText.includes("fail")
    ) {
      return "error";
    }

    if (
      searchableText.includes("overdue") ||
      searchableText.includes("missed")
    ) {
      return "overdue";
    }

    if (
      searchableText.includes("complete") ||
      searchableText.includes("success")
    ) {
      return "task_completed";
    }

    if (
      searchableText.includes("warning") ||
      notification.type === "project_invitation" ||
      searchableText.includes("need") ||
      searchableText.includes("attention")
    ) {
      return "needs_info";
    }

    return "context_updated";
  }

  /*
   * ============================
   * STATUS ICON
   * ============================
   */

  function shouldShowStatusIcon(
    cardType: NotificationCardType,
    notification: NotificationResponse,
  ) {
    if (cardType === "task_completed" || cardType === "overdue") {
      return true;
    }

    return (
      cardType === "needs_info" &&
      notification.type !== "project_invitation"
    );
  }

  /*
   * ============================
   * CLEAR NOTIFICATION
   * ============================
   */

  function dismissNotification(id: string) {
    setDismissedIds((current) => {
      const next = new Set(current);
      next.add(id);
      return next;
    });
  }

  /*
   * ============================
   * TIMESTAMP
   * ============================
   */

  function formatTimestamp(createdAt: string) {
    return new Date(createdAt).toLocaleString([], {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  /*
   * ============================
   * NOTIFICATION CLICK
   * ============================
   */

  function handleNotificationClick(item: NotificationResponse) {
    // Close notification popover
    setPopoverOpen(false);

    // Open notification details
    setSelectedId(item.id);

    // Mark notification as read
    if (!item.is_read) {
      markAsRead(item.id);
    }
  }

  /*
   * ============================
   * BELL BUTTON
   * ============================
   * This is a plain JSX element, NOT a component. PopoverTrigger
   * (asChild) injects its ref + onClick directly into this Button,
   * so the popover gets its anchor and toggles on click.
   */

  const bellButton = (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="relative"
    >
      <LucideBellRing className="h-4 w-4" />

      {hasUnread && (
        <span
          className="
            absolute
            -right-1
            -top-1
            h-2.5
            w-2.5
            rounded-full
            bg-red-500
            ring-2
            ring-background
          "
        />
      )}
    </Button>
  );

  /*
   * ============================
   * USER ERROR
   * ============================
   */

  if (userError) {
    return (
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>{bellButton}</PopoverTrigger>

        <PopoverContent
          align="end"
          sideOffset={8}
          className={POPOVER_CONTENT_CLASS}
        >
          <PopoverHeader className="sr-only">
            <PopoverTitle>Notifications</PopoverTitle>

            <PopoverDescription>Recent notifications</PopoverDescription>
          </PopoverHeader>

          <div className="rounded-xl border border-(--notification-card-border) bg-(--notification-card) p-6 text-center text-xs text-(--notification-card-muted)">
            Failed to load user information.
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  /*
   * ============================
   * MAIN
   * ============================
   */

  return (
    <>
      {/* =====================================
          NOTIFICATION BELL + POPOVER
      ====================================== */}

      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>{bellButton}</PopoverTrigger>

        <PopoverContent
          align="end"
          sideOffset={8}
          className={POPOVER_CONTENT_CLASS}
        >
          <PopoverHeader className="sr-only">
            <PopoverTitle>Notifications</PopoverTitle>

            <PopoverDescription>Recent notifications</PopoverDescription>
          </PopoverHeader>

          <div className="max-h-[calc(100vh-5rem)] overflow-y-auto">
            {notificationLoading ? (
              <div
                className="
                  rounded-xl
                  border
                  border-(--notification-card-border)
                  bg-(--notification-card)
                  p-6
                  text-xs
                  text-(--notification-card-muted)
                "
              >
                <div className="flex items-center justify-center gap-2">
                  <Loader2Icon className="h-4 w-4 animate-spin" />

                  Loading notifications...
                </div>
              </div>
            ) : notificationError ? (
              <div
                className="
                  rounded-xl
                  border
                  border-(--notification-card-border)
                  bg-(--notification-card)
                  p-6
                  text-center
                  text-xs
                  text-(--notification-card-muted)
                "
              >
                Failed to load notifications.
              </div>
            ) : visibleNotifications.length === 0 ? (
              <div
                className="
                  rounded-xl
                  border
                  border-(--notification-card-border)
                  bg-(--notification-card)
                  p-6
                  text-center
                  text-xs
                  text-(--notification-card-muted)
                "
              >
                You currently have no notifications.
              </div>
            ) : (
              <div className="space-y-3">
                {visibleNotifications.map((item) => {
                  const cardType = getNotificationCardType(item);

                  return (
                    <NotificationCard
                      key={item.id}
                      type={cardType}
                      title={item.title}
                      description={item.body}
                      timestamp={formatTimestamp(item.created_at)}
                      isRead={item.is_read}
                      showStatusIcon={shouldShowStatusIcon(
                        cardType,
                        item,
                      )}
                      actions={[
                        {
                          label: "View details",
                          onClick: () => handleNotificationClick(item),
                        },
                        {
                          label: "Clear",
                          onClick: () => dismissNotification(item.id),
                        },
                      ]}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* =====================================
          NOTIFICATION DETAILS DIALOG
      ====================================== */}

      <Dialog
        open={selectedNotification !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedId(null);
          }
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
                  {formatTimestamp(selectedNotification.created_at)}
                </DialogDescription>
              </DialogHeader>

              <NotificationDialogContent
                notification={selectedNotification}
                userId={user?.id}
                onClose={() => setSelectedId(null)}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}``