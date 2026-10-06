import { fetchWithRefresh } from "./api";

/**
 * GET /member_activities/ - List member activities with optional filters and pagination
 */
export async function listMemberActivities(
  filters: MemberActivityFilters = {}
) {
  const queryParams = new URLSearchParams();

  if (filters.projectId !== undefined) {
    queryParams.append("project_id", filters.projectId);
  }
  if (filters.limit !== undefined) {
    queryParams.append("limit", filters.limit.toString());
  }
  if (filters.offset !== undefined) {
    queryParams.append("offset", filters.offset.toString());
  }

  const queryString = queryParams.toString();
  const url = queryString ? `/member_activities?${queryString}` : "/member_activities";

  return await fetchWithRefresh<MemberActivityResponse[]>(url);
}

/**
 * GET /member_activities/{activity_id}/ - Get a single member activity by ID
 */
export async function getMemberActivity(activityId: number) {
  return await fetchWithRefresh<MemberActivityResponse>(`/member_activities/${activityId}`);
}

/**
 * POST /member_activities/ - Create a new member activity
 */
export async function createMemberActivity(activityData: MemberActivityCreate) {
  return await fetchWithRefresh<MemberActivityResponse>(
    "/member_activities",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(activityData),
    }
  );
}

// Types that match the backend schemas
export interface MemberActivityCreate {
  member_id: string; // UUID as string
  detail: string;
}

export interface MemberActivityUpdate {
  member_id?: string | null; // UUID as string
  detail?: string | null;
}

export interface MemberActivityResponse {
  id: number;
  member_id: string; // UUID as string
  detail: string;
  created_at: string; // ISO datetime string
}

// Filters for listing member activities
export interface MemberActivityFilters {
  projectId?: string; // UUID as string
  limit?: number;
  offset?: number;
}