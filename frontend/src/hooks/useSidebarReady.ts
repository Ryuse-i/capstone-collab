import { useCurrentUser } from "@/hooks/useAuth";
import { useGetMemberByUserAndProject } from "@/hooks/useProjectMember";
import { useGetCurrentProject } from "@/hooks/useProject";
import { ROLES } from "@/constants/roles";

/**
 * Single source of truth for "the sidebar has everything it needs".
 * Used by AppSidebar (to show its skeleton) and AppLayout (to keep the
 * header + page content in skeleton until the sidebar is ready).
 *
 * Only students need project/member data to decide their nav items.
 * Instructors, advisors and admins are ready as soon as the user loads.
 */
export function useSidebarReady() {
  const { data: user, isLoading: isUserLoading } = useCurrentUser();

  const isStudent = user?.role?.toLowerCase() === ROLES.STUDENT;
  const studentId = isStudent ? (user?.id ?? "") : "";

  const { data: project, isLoading: isProjectLoading } =
    useGetCurrentProject(studentId);

  const { isLoading: isMemberLoading } = useGetMemberByUserAndProject(
    studentId,
    project?.id ?? "",
  );

  if (isUserLoading || !user) return false;
  if (!isStudent) return true;

  return !isProjectLoading && !isMemberLoading;
}