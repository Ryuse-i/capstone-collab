import type {
  RecommendationType,
  RecommendationResponse,
} from "@/types/redistributionRecommendation";

/**
 * Shared contract between the Workload page (builds the link) and the
 * Project Task page / EditTaskDialog (reads it and pre-fills the drawer).
 * Only ids, dates and numbers travel in the URL. Names are looked up from
 * the project members on the other side.
 */

export const TASK_PAGE_PATH = "/project-task";

export interface TaskIntent {
  kind: RecommendationType;
  /** project_members ids (same ids EditTaskDialog uses as `member_id`). */
  fromMemberId: string | null;
  toMemberId: string | null;
  /** "YYYY-MM-DD" */
  currentDeadline: string | null;
  suggestedDeadline: string | null;
  extensionDays: number | null;
  recipientPoints: number | null;
}

const KINDS: RecommendationType[] = [
  "transfer",
  "share",
  "split",
  "reschedule",
];

/** Label for the Go button, by recommendation type. */
export const goLabels: Record<RecommendationType, string> = {
  reschedule: "Review deadline",
  transfer: "Reassign task",
  share: "Add assignee",
  split: "Split task",
};

/** Returns null when the task is gone (task_id was set to null by the backend). */
export function buildTaskLink(
  rec: Pick<
    RecommendationResponse,
    | "task_id"
    | "suggestion_type"
    | "from_member_id"
    | "to_member_id"
    | "current_deadline"
    | "suggested_deadline"
    | "extension_days"
    | "recipient_points"
  >,
): string | null {
  if (!rec.task_id) return null;

  const params = new URLSearchParams({
    task: rec.task_id,
    intent: rec.suggestion_type,
  });

  if (rec.from_member_id) params.set("from", rec.from_member_id);
  if (rec.to_member_id) params.set("to", rec.to_member_id);
  if (rec.current_deadline) params.set("current", rec.current_deadline);
  if (rec.suggested_deadline) params.set("deadline", rec.suggested_deadline);
  if (rec.extension_days != null) params.set("days", String(rec.extension_days));
  if (rec.recipient_points != null) {
    params.set("points", String(rec.recipient_points));
  }

  return `${TASK_PAGE_PATH}?${params.toString()}`;
}

function numberParam(params: URLSearchParams, key: string): number | null {
  const raw = params.get(key);
  if (raw == null || raw === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

/** Returns null when the URL has no (valid) deep link. */
export function parseTaskIntent(
  params: URLSearchParams,
): { taskId: string; intent: TaskIntent } | null {
  const taskId = params.get("task");
  const kind = params.get("intent") as RecommendationType | null;

  if (!taskId || !kind || !KINDS.includes(kind)) return null;

  return {
    taskId,
    intent: {
      kind,
      fromMemberId: params.get("from") || null,
      toMemberId: params.get("to") || null,
      currentDeadline: params.get("current") || null,
      suggestedDeadline: params.get("deadline") || null,
      extensionDays: numberParam(params, "days"),
      recipientPoints: numberParam(params, "points"),
    },
  };
}