import { type ProjectSnapshotResponse } from "./project_snapshot";

export interface ProjectCreate {
  name: string;
  description: string;
  created_by: string; // UUID
  advisor?: string | null; // UUID
  instructor?: string | null; // UUID
}

export interface ProjectUpdate {
  name?: string | null;
  description?: string | null;
  created_by?: string | null; // UUID
  advisor?: string | null; // UUID
  instructor?: string | null; // UUID
}

export interface ProjectResponse {
  id: string; // UUID
  name: string;
  description: string;
  created_by: string; // UUID
  advisor?: string | null; // UUID
  instructor?: string | null; // UUID
  created_at?: string | null; // datetime
  updated_at?: string | null; // datetime
}

export interface ProjectResponseSnapshot extends ProjectResponse {
  snapshot?: ProjectSnapshotResponse | null;
}
