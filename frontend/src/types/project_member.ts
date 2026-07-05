export type ProjectRole = "Advisor" | "Leader" | "Member";

export interface MemberBase {
  user_id: number;
  project_id: number;
  project_role: ProjectRole;
}

export interface ProjectMemberResponse extends MemberBase {
  id: number;
  created_at: Date;
  updated_at: Date;
}

export type CreateProjectMember = MemberBase;

export type UpdateProjectMember = Partial<MemberBase>;
