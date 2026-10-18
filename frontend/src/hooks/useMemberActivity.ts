import { useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/services/apiClient";
import type {
  DashboardActivity,
  MemberActivityFilters,
  MemberActivityResponse,
} from "@/types/memberActivities";

const url = "/member_activities"; // Adjust base path according to your FastAPI router prefix

const api = {
  listProjectActivities: async ({
    projectId,
    limit,
    before,
  }: MemberActivityFilters): Promise<MemberActivityResponse[]> => {
    try {
      const response = await apiClient.get<MemberActivityResponse[]>(
        `${url}/projects/${projectId}`,
        { params: { limit, before } } // undefined params are omitted by axios
      );
      return response.data;
    } catch (error) {
      console.error("Failed to fetch member activities", error);
      throw error;
    }
  },
};

export const memberActivityKeys = {
  all: ["memberActivities"] as const,
  lists: () => [...memberActivityKeys.all, "list"] as const,
  listProject: (projectId: string, limit?: number) =>
    [...memberActivityKeys.lists(), "project", projectId, limit] as const,
};

/* ---------- Mapping to the dashboard card format ---------- */

type Tone = "green" | "yellow" | "red";

const TYPE_META: Record<string, { action: string; tone: Tone }> = {
  task_created:        { action: "created",            tone: "green" },
  task_submitted:      { action: "submitted",          tone: "yellow" },
  task_status_changed: { action: "updated",            tone: "yellow" },
  comment_added:       { action: "commented on",       tone: "yellow" },
  member_joined:       { action: "joined",             tone: "green" },
  revision_requested:  { action: "requested revision", tone: "red" },
  submission_accepted: { action: "accepted",           tone: "green" },
};

const COLORS = {
  green:  { color: "bg-green-500",  text: "text-green-500" },
  yellow: { color: "bg-yellow-500", text: "text-yellow-500" },
  red:    { color: "bg-red-500",    text: "text-red-500" },
} as const;

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function toDashboardActivity(a: MemberActivityResponse): DashboardActivity {
  // Old rows have type = null, so fall back to a generic "updated"
  const meta = TYPE_META[a.type ?? ""] ?? {
    action: "updated",
    tone: "yellow" as Tone,
  };
  return {
    id: a.id,
    user: a.actor_name ?? "A member",
    action: meta.action,
    task: a.task_name ?? "a task",
    time: timeAgo(a.created_at),
    ...COLORS[meta.tone],
  };
}

/* ---------- Hooks ---------- */

/**
 * Latest activities for one project, mapped for the dashboard card.
 * The API returns newest first, so no client-side sort is needed.
 */
export function useGetMemberActivities(projectId: string, limit = 10) {
  return useQuery({
    queryKey: memberActivityKeys.listProject(projectId, limit),
    queryFn: () => api.listProjectActivities({ projectId, limit }),
    enabled: !!projectId,
    select: (activities) => activities.map(toDashboardActivity),
  });
}

/**
 * Call the returned function in the onSuccess of any mutation that logs an
 * activity (create task, update task status, add comment) so the card refreshes.
 */
export function useInvalidateMemberActivities() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: memberActivityKeys.all });
}