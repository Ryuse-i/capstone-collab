// only these roles can be granted by an invite link (matches backend validator)
export type InviteRole = "member" | "instructor" | "advisor";

export type InviteInvalidReason = "expired" | "revoked" | "used_up";

export interface InviteLinkCreate {
  project_id: string;
  role: InviteRole;
  expires_in_days?: number; // 1-30, backend default 7
  max_uses?: number | null; // null/undefined = unlimited
}

export interface InviteLinkResponse {
  id: string;
  project_id: string;
  created_by: string;
  role: InviteRole;
  expires_at: string;
  max_uses: number | null;
  use_count: number;
  revoked_at: string | null;
  created_at: string;
}

// returned once, at creation. the raw token is never retrievable again
export interface InviteLinkCreated extends InviteLinkResponse {
  token: string;
}

export interface InviteLinkPreview {
  project_name: string;
  role: InviteRole;
  inviter_name: string;
  valid: boolean;
  reason: InviteInvalidReason | null;
}

export interface InviteLinkAccepted {
  project_id: string;
  role: InviteRole;
  already_member: boolean;
}