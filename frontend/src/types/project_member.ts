import type { UserBase } from "./user";
import type { MemberSnapshotResponse } from "./member_snapshot";

export type ProjectRole =
  | "advisor"
  | "instructor"
  | "leader"
  | "member"
  | "admin";

export type Skill =
  | "Backend Development"
  | "Frontend Development"
  | "Mobile Development"
  | "IOT Development"
  | "Database Design"
  | "System Architecture"
  | "UI/UX Design"
  | "Testing and Quality Assurance"
  | "Literature Review"
  | "Data Collection"
  | "Survey and Questionnaire Design"
  | "Interview and Observation"
  | "Data Analysis"
  | "Technical Writing"
  | "Documentation"
  | "Diagram and Modeling"
  | "Editing and Proofreading"
  | "Financial Documentation"
  | "Budget Planning"
  | "Resource Management";

export interface MemberBase {
  user_id: string;
  project_id: string;
  project_role: ProjectRole;
}

export interface ProjectMemberResponse extends MemberBase {
  id: string;
  created_at: Date;
  updated_at: Date;
  skills: Skill[] | null;
}

export type CreateProjectMember = MemberBase;

export type UpdateProjectMember = Partial<MemberBase> & {
  skills: Skill[] | null;
};

export interface ProjectMemberUserResponse extends ProjectMemberResponse {
  users: UserBase;
}

export interface ProjectMemberUserSnapshot extends ProjectMemberResponse {
  user: UserBase;
  snapshots: MemberSnapshotResponse[];
}
