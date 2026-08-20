import type { UserBase } from "./user";

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
  | "Iot Development"
  | "Database Design"
  | "System Architecture"
  | "Ui/Ux Design"
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
  id: number;
  created_at: Date;
  updated_at: Date;
}

export type CreateProjectMember = MemberBase;

export type UpdateProjectMember = Partial<MemberBase>;

export interface ProjectMemberUserResponse extends ProjectMemberResponse {
  user: UserBase;
}
