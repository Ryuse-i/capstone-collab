import type { UserBase } from "./user";

export type TaskCommentContent = string;

export interface TaskCommentBase {
  task_id: string;
  author_id: string;
  content: TaskCommentContent;
}

export type CreateTaskComment = TaskCommentBase;

export type UpdateTaskComment = Partial<TaskCommentBase>;

export interface TaskCommentResponse extends TaskCommentBase {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface TaskCommentResponseWithAuthor extends TaskCommentResponse {
  author: UserBase;
}