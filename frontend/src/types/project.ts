import type { ProjectSnapshotBase } from "./project_snapshot";

export interface ProjectBase {
  name: string;
  description: string;
  created_by: string; // UUID
  advisor: string | null; // UUID
  instructor: string | null; // UUID
}

export interface ProjectResponse extends ProjectBase {
  id: string; // UUID
  created_at: string | null; // datetime
  updated_at: string | null; // datetime
}

export type CreateProject = Pick<ProjectBase, "name" | "description" | "created_by"> & Partial<
  Pick<ProjectBase, "advisor" | "instructor">
>;

export type UpdateProject = Partial<ProjectBase>;

export interface ProjectWithSnapshot extends ProjectBase {
  snapshot: ProjectSnapshotBase
}

