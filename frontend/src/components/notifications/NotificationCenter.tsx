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
import {
  useAcceptInvite,
  useDeclineInvite,
  useGetOneInvite,
} from "@/hooks/useProjectInvite";
import { projectKeys, useGetOneProject } from "@/hooks/useProject";
import type { NotificationResponse } from "@/types/notification";
import { useQueryClient } from "@tanstack/react-query";

interface NotificationCenterProps {
  userId?: string;
}

export default function NotificationCenter({
  userId,
}: NotificationCenterProps) {
  const [selectedNotification, setSelectedNotification] =
    React.useState<NotificationResponse | null>(null);
  const queryClient = useQueryClient();
  const { data, isLoading: notificationLoading } = useGetUserNotifications(
    userId ?? "",
  );
  const notifications: NotificationResponse[] = data ?? [];
  const { mutate: markAsRead } = useMarkAsRead();
  const { mutate: acceptInvite, isPending: isAcceptPending } =
    useAcceptInvite();
  const { mutate: declineInvite, isPending: isDeclinePending } =
    useDeclineInvite();
  const {
    data: invite,
    isLoading: inviteLoading,
    isFetching: inviteFetching,
  } = useGetOneInvite(selectedNotification?.invitation_id);
  const {
    data: project,
    isLoading: projectLoading,
    isFetching: projectFetching,
  } = useGetOneProject(invite?.project_id ?? "");

  const hasUnread = notifications.some((item) => !item.is_read);
  const isInviteDataLoading =
    !!selectedNotification &&
    selectedNotification.type === "project_invitation" &&
    !!selectedNotification.invitation_id &&
    (inviteLoading ||
      inviteFetching ||
      (!!invite?.project_id && (projectLoading || projectFetching)));

  function handleNotificationClick(item: NotificationResponse) {
    setSelectedNotification(item);
    if (!item.is_read) markAsRead(item.id);
  }

  function handleAcceptInvite() {
    if (!selectedNotification?.invitation_id) return;

    acceptInvite(selectedNotification.invitation_id, {
      onSuccess: () => {
        setSelectedNotification(null);
        if (userId) {
          queryClient.invalidateQueries({
            queryKey: projectKeys.listUser(userId),
          });
        }
      },
    });
  }

  function handleDeclineInvite() {
    if (!selectedNotification?.invitation_id) return;
    declineInvite(selectedNotification.invitation_id, {
      onSuccess: () => setSelectedNotification(null),
    });
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
        <PopoverContent align="end" className="w-80 p-0">
          <PopoverHeader className="border-b px-4 pb-2 pt-4">
            <PopoverTitle className="text-base font-semibold">
              Notifications
            </PopoverTitle>
            <PopoverDescription>
              View and manage your notifications
            </PopoverDescription>
          </PopoverHeader>
          <div className="max-h-64 overflow-y-auto">
            {notificationLoading ? (
              <div className="flex items-center justify-center gap-2 p-6 text-xs text-muted-foreground">
                <Loader2Icon className="h-4 w-4 animate-spin" />
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                You currently have no notifications
              </div>
            ) : (
              notifications.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`flex w-full items-center gap-2 border-b p-4 text-left text-sm transition-colors last:border-0 ${
                    !item.is_read
                      ? "cursor-pointer bg-muted/30 font-medium hover:bg-muted/50"
                      : "cursor-pointer opacity-70 hover:bg-muted/30"
                  }`}
                  onClick={() => handleNotificationClick(item)}
                >
                  {!item.is_read && (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                  )}
                  <span
                    className={`flex-1 truncate pl-1 ${
                      !item.is_read
                        ? "font-semibold text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {item.title}
                  </span>
                  <span className="ml-2 whitespace-nowrap text-xs font-normal text-muted-foreground">
                    {new Date(item.created_at).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </button>
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
              <p className="whitespace-pre-wrap text-sm text-foreground">
                {selectedNotification.body}
              </p>

              {selectedNotification.type === "project_invitation" &&
                (isInviteDataLoading ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                    <Loader2Icon className="h-4 w-4 animate-spin" />
                    Loading invitation details...
                  </div>
                ) : (
                  <>
                    {project && (
                      <div className="mt-3 rounded-md border bg-muted/5 p-3">
                        <h4 className="text-sm font-semibold">
                          {project.name}
                        </h4>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {project.description}
                        </p>
                      </div>
                    )}{console.log("DEBUG sender_id:", invite?.sender_id, "userId:", userId, "match:", invite?.sender_id === userId)}
                    {invite?.status === "pending" &&
                      (userId && invite.sender_id !== userId ? (
                        <div className="flex gap-2 pt-3">
                          <Button
                            type="button"
                            className="flex-1"
                            onClick={handleAcceptInvite}
                            disabled={isAcceptPending || isDeclinePending}
                          >
                            {isAcceptPending ? "Accepting..." : "Accept Invite"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={handleDeclineInvite}
                            disabled={isAcceptPending || isDeclinePending}
                          >
                            {isDeclinePending
                              ? "Declining..."
                              : "Decline Invite"}
                          </Button>
                        </div>
                      ) : (
                        <p className="pt-3 text-sm text-muted-foreground">
                          Waiting for a response to this invitation.
                        </p>
                      ))}
                    {invite?.status === "accepted" && (
                      <div className="mt-3 rounded-md border bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950/30 dark:text-green-200">
                        You have accepted this invitation.
                      </div>
                    )}
                    {invite?.status === "rejected" && (
                      <div className="mt-3 rounded-md border bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-200">
                        You have declined this invitation.
                      </div>
                    )}
                  </>
                ))}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
