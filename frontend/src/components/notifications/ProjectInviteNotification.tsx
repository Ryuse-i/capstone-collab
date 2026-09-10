import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useAcceptInvite,
  useDeclineInvite,
  useGetOneInvite,
} from "@/hooks/useProjectInvite";
import { projectKeys, useGetOneProject } from "@/hooks/useProject";
import { useQueryClient } from "@tanstack/react-query";

interface ProjectInviteNotificationProps {
  invitationId: string;
  userId?: string;
  body: string;
  onClose: () => void;
}

export default function ProjectInviteNotification({
  invitationId,
  userId,
  body,
  onClose,
}: ProjectInviteNotificationProps) {
  const queryClient = useQueryClient();
  const { mutate: acceptInvite, isPending: isAcceptPending } =
    useAcceptInvite();
  const { mutate: declineInvite, isPending: isDeclinePending } =
    useDeclineInvite();
  const {
    data: invite,
    isLoading: inviteLoading,
    isFetching: inviteFetching,
  } = useGetOneInvite(invitationId);
  const {
    data: project,
    isLoading: projectLoading,
    isFetching: projectFetching,
  } = useGetOneProject(invite?.project_id ?? "");

  const isInviteDataLoading =
    inviteLoading ||
    inviteFetching ||
    (!!invite?.project_id && (projectLoading || projectFetching));
  const isSender = !!userId && !!invite && invite.sender_id === userId;

  function handleAcceptInvite() {
    acceptInvite(invitationId, {
      onSuccess: () => {
        onClose();
        if (userId) {
          queryClient.invalidateQueries({
            queryKey: projectKeys.listUser(userId),
          });
        }
      },
    });
  }

  function handleDeclineInvite() {
    declineInvite(invitationId, {
      onSuccess: onClose,
    });
  }

  return (
    <>
      <p className="whitespace-pre-wrap text-sm text-foreground">{body}</p>
      {isInviteDataLoading ? (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2Icon className="h-4 w-4 animate-spin" />
          Loading invitation details...
        </div>
      ) : (
        <>
          {project && (
            <div className="mt-3 rounded-md border bg-muted/5 p-3">
              <h4 className="text-sm font-semibold">{project.name}</h4>
              <p className="mt-1 text-xs text-muted-foreground">
                {project.description}
              </p>
            </div>
          )}
          {invite?.status === "pending" &&
            (!isSender ? (
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
                  {isDeclinePending ? "Declining..." : "Decline Invite"}
                </Button>
              </div>
            ) : (
              <p className="pt-3 text-sm text-muted-foreground">
                You sent this invitation and are waiting for a response.
              </p>
            ))}
          {invite?.status === "accepted" && (
            <div className="mt-3 rounded-md border bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950/30 dark:text-green-200">
              {isSender
                ? "This invitation has been accepted."
                : "You have accepted this invitation."}
            </div>
          )}
          {invite?.status === "rejected" && (
            <div className="mt-3 rounded-md border bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-200">
              {isSender
                ? "This invitation has been declined."
                : "You have declined this invitation."}
            </div>
          )}
        </>
      )}
    </>
  );
}
