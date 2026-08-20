import type { UserBase } from "./user";

export interface AssignedMemberBase {
  user_id: string;
  task_id: string;
  effort_share?: number;
}

export type CreateAssignedMember = AssignedMemberBase;
export type UpdateAssignedMember = Partial<AssignedMemberBase>;

export interface AssignedMemberResponse extends AssignedMemberBase {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface AssigneMemberWithUser extends AssignedMemberResponse {
  users: UserBase[];
}
