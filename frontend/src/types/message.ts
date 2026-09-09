import type { UserBase } from "./user";

export interface MessageBase {
  id?: string; // UUID
  project_id: string; // UUID
  sender_id: string; // UUID
  content: string;
}

export interface MessageResponse extends MessageBase {
  id: string; // UUID
  created_at: string; // datetime
  sender: UserBase;
}

export type CreateMessage = Pick<MessageBase, "project_id" | "content">;

export type UpdateMessage = Partial<Pick<MessageBase, "content">>;
