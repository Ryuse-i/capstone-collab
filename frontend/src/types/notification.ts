export type NotificationType = "project_invitation" | "general";

export interface NotificationBase {
  user_id: string;
  title: string,
  body: string,
  is_read: boolean,
  type: NotificationType;
  invitation_id: string;
}

// omit first to extract other needed fields then partial pick to make optional
export type NotificationCreate = Omit<NotificationBase, "invitation_id" | "is_read"> &
  Partial<Pick<NotificationBase, "invitation_id">>;
export type NotificationUpdate = Partial<NotificationBase>;

export interface NotificationResponse extends NotificationBase {
  id: string;
  created_at: string;
  updated_at: string;
}
