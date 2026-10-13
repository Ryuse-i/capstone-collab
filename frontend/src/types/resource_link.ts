import type { UserBase } from "./user";

export interface ResourceLinkBase {
  url: string;
  title?: string | null;
}

export type CreateResourceLink = ResourceLinkBase;

export type UpdateResourceLink = Partial<ResourceLinkBase>;

export interface ResourceLinkResponse extends ResourceLinkBase {
  id: string;
  resource_id: string;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
  creator: UserBase | null;
}