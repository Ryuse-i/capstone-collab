export type TaskStatus =
  | "not_started"
  | "in_progress"
  | "submitted"
  | "completed";
export type TaskPriority = "low" | "medium" | "high";
export type TaskComplexity = "low" | "medium" | "high";
export type TaskCategory = "document" | "research" | "development";
import type { Skill } from "./project_member";
import type { UserBase } from "./user";

export interface TaskBase {
  name: string;
  description: string;
  created_by: string;
  project_id: string;
  priority: TaskPriority;
  category: TaskCategory;
  deadline: string;
  complexity?: TaskComplexity;
  complexity_points?: number;
  total_time_spent?: number;
  started_at?: string;
  completed_at?: string;
  status?: TaskStatus;
  supertask_id?: string;
  primary_skill: Skill;
  secondary_skills?: Skill[];
}

export type CreateTask = TaskBase;

export type UpdateTask = Partial<TaskBase>;

export interface TaskResponse extends TaskBase {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface TaskResponseMembers extends TaskResponse {
  assigned_members: UserBase[];
}
