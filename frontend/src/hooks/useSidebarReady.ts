import { useCurrentUser } from "@/hooks/useAuth";
import { useGetCurrentMember } from "@/hooks/useProjectMember";
import { useGetCurrentProject } from "@/hooks/useProject";

/**
 * Single source of truth for "the sidebar has everything it needs".
 * Used by AppSidebar (to show its skeleton) and AppLayout (to keep the
 * header + page content in skeleton until the sidebar is ready).
 */
export function useSidebarReady() {
  const { data: user } = useCurrentUser();

  const { isLoading: isProjectLoading } = useGetCurrentProject(user?.id ?? "");
  const { isLoading: isMemberLoading } = useGetCurrentMember(user?.id ?? "");

  return !isProjectLoading && !isMemberLoading && !!user;
}