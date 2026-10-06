import { useQuery} from "@tanstack/react-query";
import { listMemberActivities } from "@/services/memberActivities";
import type { MemberActivityResponse } from "@/services/memberActivities";

// Helper function to extract user name from member_id
// This would ideally be done by expanding the API to include user data
// For now, we'll map the activity to the format needed for the dashboard
function mapActivityToDashboardFormat(
  activity: MemberActivityResponse,
): {
  id: number;
  user: string;
  action: string;
  task: string;
  time: string;
  color: "bg-green-500" | "bg-yellow-500" | "bg-red-500";
  text: "text-green-500" | "text-yellow-500" | "text-red-500";
} {
  // Extract action from detail (this is a simplified parsing)
  // In a real implementation, the backend would provide structured data
  const detail = activity.detail.toLowerCase();

  let action = "updated";
  let task = "Unknown task";

  if (detail.includes("completed")) {
    action = "completed";
  } else if (detail.includes("submitted")) {
    action = "submitted";
  } else if (detail.includes("started") || detail.includes("begin")) {
    action = "started";
  } else if (detail.includes("updated") || detail.includes("modified")) {
    action = "updated";
  }

  // Extract task name (simplified - in reality would come from relation)
  // For now, we'll use a placeholder or extract from detail
  if (detail.includes("task:")) {
    const taskMatch = detail.match(/task:\s*([^,.]+)/i);
    if (taskMatch && taskMatch[1]) {
      task = taskMatch[1].trim();
    }
  } else {
    // Default task name based on action
    task = `${action.charAt(0).toUpperCase() + action.slice(1)} task`;
  }

  // Determine color based on action
  let color: "bg-green-500" | "bg-yellow-500" | "bg-red-500";
  let text: "text-green-500" | "text-yellow-500" | "text-red-500";

  switch (action) {
    case "completed":
      color = "bg-green-500";
      text = "text-green-500";
      break;
    case "submitted":
      color = "bg-yellow-500";
      text = "text-yellow-500";
      break;
    case "started":
      color = "bg-green-500";
      text = "text-green-500";
      break;
    case "updated":
      color = "bg-yellow-500";
      text = "text-yellow-500";
      break;
    default:
      color = "bg-red-500";
      text = "text-red-500";
  }

  // Format time (simplified - would use date-fns or similar in reality)
  const createdAt = new Date(activity.created_at);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - createdAt.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let timeString: string;
  if (diffTime < 60 * 1000) { // less than 1 minute
    timeString = "just now";
  } else if (diffTime < 3 * 60 * 1000) { // less than 3 minutes
    timeString = "1m ago";
  } else if (diffTime < 60 * 60 * 1000) { // less than 1 hour
    const minutes = Math.ceil(diffTime / (60 * 1000));
    timeString = `${minutes}m ago`;
  } else if (diffTime < 24 * 60 * 60 * 1000) { // less than 1 day
    const hours = Math.ceil(diffTime / (60 * 60 * 1000));
    timeString = `${hours}h ago`;
  } else if (diffDays === 1) {
    timeString = "1d ago";
  } else if (diffDays < 7) {
    timeString = `${diffDays}d ago`;
  } else {
    timeString = createdAt.toLocaleDateString();
  }

  // For user name, we'll use a placeholder since we don't have user data in the activity response
  // In a real implementation, we would fetch user data or expand the API
  const user = `Member ${activity.member_id.slice(0, 8)}`;

  return {
    id: activity.id,
    user,
    action,
    task,
    time: timeString,
    color,
    text,
  };
}

export const memberActivityKeys = {
  all: ["memberActivities"] as const,
  list: () => [...memberActivityKeys.all, "list"] as const,
  listProject: (projectId: string) =>
    [...memberActivityKeys.all, "list", "project", projectId] as const,
};

export function useGetMemberActivities(projectId: string) {
  return useQuery({
    queryKey: memberActivityKeys.listProject(projectId),
    queryFn: () => listMemberActivities({ projectId, limit: 10 }), // Get latest 10 activities
    enabled: !!projectId,
    select: (activities) =>
      activities
        .map((activity) => mapActivityToDashboardFormat(activity))
        // Sort by created_at descending (most recent first)
        .sort(() => {
          // Since we don't have direct access to created_at in the mapped format,
          // we'll rely on the order from the API which should be sorted by created_at desc
          return 0; // Maintain original order from API
        }),
  });
}