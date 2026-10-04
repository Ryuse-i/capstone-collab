export interface SupertaskCreationAttributes {
  name: string;
  description: string | null;
  project_id: string;
}

export type CreateSupertask = SupertaskCreationAttributes;

export interface SupertaskUpdateAttributes {
  name?: string;
  description?: string | null;
}

export type UpdateSupertask = SupertaskUpdateAttributes;

export interface SupertaskResponse extends SupertaskCreationAttributes {
  id: string;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}