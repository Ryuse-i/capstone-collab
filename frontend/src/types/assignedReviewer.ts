import type { UserBase } from "./user";

export interface AssignedReviewerBase {
  member_id: string;
  task_id: string;
}

export type AssignedReviewerCreate = AssignedReviewerBase;
export type AssignedReviewerUpdate = Partial<AssignedReviewerBase>;

export interface AssignedReviewerResponse extends AssignedReviewerBase {
  id: string;
  created_at: string;
}

// For compatibility with hooks that expect users data
export interface AssignedReviewerWithUser extends AssignedReviewerResponse {
  users: UserBase[];
}