import AppLayout from "@/layouts/Applayout";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle } from "lucide-react";
import { useGetMembersWithUserSnapshot } from "@/hooks/useProjectMember";
import { useGetCurrentProject } from "@/hooks/useProject";
import { useCurrentUser } from "@/hooks/useAuth";
import { useGetAllTaskAssignedMembers } from "@/hooks/useTask";
import TeamMembersPanel, {
  TeamMembersSkeleton,
} from "@/components/user/TeamMembersPanel";

function TeamSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-96 max-w-full" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      <TeamMembersSkeleton />
    </div>
  );
}

export default function Team() {
  const { data: user } = useCurrentUser();

  const {
    data: project,
    isLoading: isProjectLoading,
    isError: isProjectError,
  } = useGetCurrentProject(user?.id ?? "");

  const {
    data: members = [],
    isLoading: isMembersLoading,
    isError: isMembersError,
  } = useGetMembersWithUserSnapshot(project?.id ?? "");

  // Kept out of the page-level loading/error state so a failure here only
  // affects the Contribution card.
  const {
    data: allProjectTasks = [],
    isLoading: isTasksLoading,
    isError: isTasksError,
  } = useGetAllTaskAssignedMembers(project?.id ?? "");

  const isLoading = isProjectLoading || isMembersLoading;
  const isError = isProjectError || isMembersError;

  return (
    <AppLayout breadcrumbs={[{ label: "Team Members", href: "/Team" }]}>
      {isError ? (
        <div className="flex h-screen flex-col items-center justify-center gap-4">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <p className="text-foreground dark:text-muted-foreground">
            Failed to load project data. Please try again later.
          </p>
        </div>
      ) : isLoading ? (
        <TeamSkeleton />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-foreground">
              Manage members and monitor activities
            </h1>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Track workload, capacity and contribution across your project
              team.
            </p>
          </div>

          <TeamMembersPanel
            members={members}
            tasks={allProjectTasks}
            isTasksLoading={isTasksLoading}
            isTasksError={isTasksError}
            currentUserId={user?.id ?? ""}
          />
        </div>
      )}
    </AppLayout>
  );
}