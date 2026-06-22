export type ProjectRole = "Advisor" | "Leader" | "Member";

export interface ProjectMember {
  id: number;
  user_id: number;
  project_id: number;
  project_role: ProjectRole;
  created_at: Date;
  updated_at: Date;
}

export type CreateProjectMemberInput = Omit<
  ProjectMember,
  "id" | "created_at" | "updated_at"
>;

export type UpdateProjectMemberInput = Partial<
  Omit<ProjectMember, "id" | "created_at" | "updated_at">
>;
