import type { UserBase } from "./user";

export interface TaskLinkBase {
  url: string;
  title?: string | null;
}

export type CreateTaskLink = TaskLinkBase;

export type UpdateTaskLink = Partial<TaskLinkBase>;

export interface TaskLinkResponse extends TaskLinkBase {
  id: string;
  task_id: string;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
  creator: UserBase | null;
}