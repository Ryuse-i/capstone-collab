import { type ProjectRole } from "./project_member";

export type InviteStatus = "pending" | "accepted" | "rejected";

export interface ProjectInviteBase {
  project_id: string;
  email: string;
  sender_id: string;
  role: ProjectRole;
  status: InviteStatus;
}

export type CreateInvite = Omit<ProjectInviteBase, "status">;

export type UpdateInvite = Partial<ProjectInviteBase>;

export interface InviteResponse extends ProjectInviteBase {
  id: string;
  create_at: string;
}
