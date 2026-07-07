export type ProjectRole = "advisor" | "leader" | "member";

export interface MemberBase {
  user_id: string;
  project_id: string;
  project_role: ProjectRole;
}

export interface ProjectMemberResponse extends MemberBase {
  id: number;
  created_at: Date;
  updated_at: Date;
}

export type CreateProjectMember = MemberBase;

export type UpdateProjectMember = Partial<MemberBase>;
