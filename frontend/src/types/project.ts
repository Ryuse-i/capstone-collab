import { type ProjectSnapshot } from "./project_snapshot";

export interface Project {
  id: string; // UUID
  name: string;
  description: string;
  created_by: string; // UUID
  advisor: string | null; // UUID
  instructor: string | null; // UUID
  created_at: string | null; // datetime
  updated_at: string | null; // datetime
}

export type CreateProjectInput = Omit<
  Project,
  "id" | "created_at" | "updated_at"
> &
  Partial<Pick<Project, "advisor" | "instructor">>;

export type UpdateProjectInput = Partial<
  Omit<Project, "id" | "created_at" | "updated_at">
>;

export interface ProjectResponseSnapshot extends Project {
  snapshot: ProjectSnapshot;
}
