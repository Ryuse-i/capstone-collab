export type TaskStatus =
  | "not_started"
  | "in-progress"
  | "submitted"
  | "completed";
export type TaskPriority = "low" | "medium" | "high";
export type TaskComplexity = "low" | "medium" | "high";
export type TaskCategory = "document" | "research" | "development";
import type { Skill } from "./project_member";

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
  status?: TaskStatus;
  supertask_id?: string;
   Primaryskill: Skill
   Secondaryskill: Skill[]
}

export type CreateTask = TaskBase;

export type UpdateTask = Partial<TaskBase>;

export interface TaskResponse extends TaskBase {
  id: string;
  created_at: string;
  updated_at: string;
}
