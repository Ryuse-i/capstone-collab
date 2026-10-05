export type ResourceCategory = "Links" | "Paper Files" | "Code";

export interface ResourceFile {
  id: string;
  filename: string;
  size: number;
  content_type: string;
  uploaded_by: string | null;
  created_at: string;
}

export interface ResourceCreator {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export interface ProjectResource {
  id: string;
  project_id: string;
  created_by: string | null;
  title: string;
  category: ResourceCategory;
  description: string;
  source_url: string | null;
  file: ResourceFile | null;
  creator: ResourceCreator | null;
  pinned: boolean;
  uses: number;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectResourceInput {
  title: string;
  category: ResourceCategory;
  description: string;
  source_url: string;
  attachment: File | null;
}

export interface ResourceUrlResponse {
  url: string;
}