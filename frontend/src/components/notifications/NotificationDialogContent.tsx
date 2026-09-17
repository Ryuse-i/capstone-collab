import type { NotificationResponse } from "@/types/notification";
import GeneralNotification from "./GeneralNotification";
import ProjectInviteNotification from "./ProjectInviteNotification";

interface NotificationDialogContentProps {
  notification: NotificationResponse;
  userId?: string;
  onClose: () => void;
}

export default function NotificationDialogContent({
  notification,
  userId,
  onClose,
}: NotificationDialogContentProps) {
  if (notification.type === "project_invitation" && notification.invitation_id) {
    return (
      <ProjectInviteNotification
        invitationId={notification.invitation_id}
        userId={userId}
        body={notification.body}
        onClose={onClose}
      />
    );
  }

  return <GeneralNotification body={notification.body} />;
}
