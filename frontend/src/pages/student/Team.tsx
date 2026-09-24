import AppLayout from "@/layouts/Applayout";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent } from "@/components/ui/card";
import {
  Mail,
  AlertTriangle,
  Gauge,
  Repeat,
  ShieldAlert,
} from "lucide-react";
import { useGetMembersWithUserSnapshot } from "@/hooks/useProjectMember";
import { useGetCurrentProject } from "@/hooks/useProject";
import { useCurrentUser } from "@/hooks/useAuth";
import type {
  ProjectMemberUserSnapshot,
  ProjectRole,
} from "@/types/project_member";
import type { MemberStatus } from "@/types/member_snapshot";

const roleStyles: Record<ProjectRole, string> = {
  admin: "border-purple-400 text-purple-600 bg-purple-50 dark:bg-purple-950/20",
  advisor: "border-blue-400 text-blue-600 bg-blue-50 dark:bg-blue-950/20",
  instructor:
    "border-indigo-400 text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20",
  leader:
    "border-orange-400 text-orange-600 bg-orange-50 dark:bg-orange-950/20",
  member: "border-gray-400 text-gray-600 bg-gray-50 dark:bg-gray-800/40",
};

const workloadStyles: Record<
  MemberStatus,
  { label: string; badge: string; bar: string }
> = {
  overloaded: {
    label: "Overloaded",
    badge: "border-red-400 text-red-500 bg-red-50 dark:bg-red-950/20",
    bar: "bg-red-500",
  },
  underutilized: {
    label: "Underutilized",
    badge:
      "border-yellow-400 text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20",
    bar: "bg-yellow-400",
  },
  normal: {
    label: "Normal",
    badge: "border-green-400 text-green-600 bg-green-50 dark:bg-green-950/20",
    bar: "bg-green-500",
  },
};

function getInitials(first: string, last: string) {
  return `${first?.trim()?.[0] ?? ""}${last?.trim()?.[0] ?? ""}`.toUpperCase();
}

function capacityPercent(multiplier: number) {
  // capacity_multiplier is expressed relative to 1.0 (baseline capacity).
  // Clamp to a 0–200% visual range so bars stay readable.
  return Math.min(Math.max(multiplier * 100, 0), 200) / 2;
}

function MemberCard({
  member,
  showWorkload = true,
}: {
  member: ProjectMemberUserSnapshot;
  showWorkload?: boolean;
}) {
  const { user, project_role } = member;
  const snapshot = member.snapshots[0];

  // total_effective_points / capacity_multiplier come back from the API as
  // strings (Decimal serialization), so parse before doing any math/formatting.
  const points =
    snapshot !== undefined
      ? parseFloat(snapshot.total_effective_points)
      : undefined;
  const capacity =
    snapshot !== undefined
      ? parseFloat(snapshot.capacity_multiplier)
      : undefined;

  const workload = workloadStyles[snapshot?.workload_status ?? "normal"];
  const initials = getInitials(user.first_name, user.last_name);

  return (
    <Card className="shadow-sm border rounded-xl">
      <CardContent
        className={`p-5 flex flex-col ${showWorkload ? "gap-4" : "gap-3"}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 shrink-0 rounded-full border-2 border-gray-300 flex items-center justify-center bg-primary dark:bg-gray-800 dark:border-gray-600">
              <span className="text-sm font-bold text-primary-foreground dark:text-foreground">
                {initials}
              </span>
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <span className="font-semibold text-card-foreground text-sm truncate">
                {user.first_name.trim()} {user.last_name.trim()}
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 truncate">
                <Mail className="w-3 h-3 shrink-0" />
                {user.email}
              </span>
              <span
                className={`text-xs border rounded-full px-2 py-0.5 w-fit capitalize ${roleStyles[project_role]}`}
              >
                {project_role}
              </span>
            </div>
          </div>

          {!showWorkload && snapshot?.silence_warning && (
            <span
              title="No recent activity reported"
              className="flex items-center gap-1 text-xs font-semibold border border-red-400 text-red-500 bg-white dark:bg-red-950/10 rounded px-2 py-1 shrink-0"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Silent
            </span>
          )}
        </div>

        {showWorkload && (
          <>
            {/* Workload status */}
            <div className="bg-gray-50 dark:bg-card-foreground/5 rounded-lg px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 dark:text-card-foreground">
                  Workload status
                </p>
                <p className="text-sm font-semibold text-gray-800 dark:text-card-foreground mt-0.5">
                  {workload.label}
                </p>
              </div>
              <span
                className={`text-xs font-bold border rounded px-2 py-1 ${workload.badge}`}
              >
                {workload.label.toUpperCase()}
              </span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 border-b pb-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1 text-blue-500">
                  <Gauge className="w-3.5 h-3.5" />
                  <span className="text-xs text-gray-400">Points</span>
                </div>
                <span className="text-2xl font-bold text-gray-800 dark:text-card-foreground">
                  {points !== undefined ? points : "—"}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1 text-yellow-500">
                  <Repeat className="w-3.5 h-3.5" />
                  <span className="text-xs text-gray-400">Fallbacks</span>
                </div>
                <span className="text-2xl font-bold text-gray-800 dark:text-card-foreground">
                  {snapshot ? snapshot.consecutive_fallback_count : "—"}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1 text-gray-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span className="text-xs text-gray-400">Capacity</span>
                </div>
                <span className="text-2xl font-bold text-gray-800 dark:text-card-foreground">
                  {capacity !== undefined ? `${capacity.toFixed(1)}x` : "—"}
                </span>
              </div>
            </div>

            {/* Capacity bar */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-gray-500 dark:text-card-foreground">
                <span>Capacity multiplier</span>
                <span>
                  {capacity !== undefined
                    ? `${capacity.toFixed(2)}x`
                    : "No data"}
                </span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${workload.bar}`}
                  style={{
                    width: `${capacity !== undefined ? capacityPercent(capacity) : 0}%`,
                  }}
                />
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function AdvisorPlaceholderCard({ message }: { message: string }) {
  return (
    <div className="grid grid-cols-1 gap-4 h-34.5">
      <Card className="shadow-sm border rounded-xl">
        <CardContent className="p-5 flex min-h-full items-center justify-center text-center text-sm text-gray-500 dark:text-gray-400">
          {message}
        </CardContent>
      </Card>
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

  const isLoading = isProjectLoading || isMembersLoading;
  const isError = isProjectError || isMembersError;

  const advisorMembers =
    members?.filter((member) => member.project_role === "advisor") ?? [];

  const instructorMembers =
    members?.filter((member) => member.project_role === "instructor") ?? [];

  const regularMembers =
    members?.filter(
      (member) =>
        member.project_role !== "advisor" &&
        member.project_role !== "instructor",
    ) ?? [];

  return (
    <AppLayout breadcrumbs={[{ label: "Team Members", href: "/Team" }]}>
      {isError ? (
        <div className="flex flex-col justify-center items-center gap-4 h-screen">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <p className="text-foreground dark:text-muted-foreground">
            Failed to load project data. Please try again later.
          </p>
        </div>
      ) : isLoading ? (
        <div className="flex flex-1 justify-center items-center">
          <Spinner />
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-foreground">
              Manage members and monitor activities
            </h1>
            <span className="text-sm text-gray-400 dark:text-gray-500">
              {regularMembers.length} regular member
              {regularMembers.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="mb-6 grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div>
              <h2 className="mb-3 text-lg font-semibold text-foreground">
                Advisor
              </h2>
              {advisorMembers.length > 0 ? (
                <div className="w-full gap-4">
                  {advisorMembers.map((member) => (
                    <MemberCard
                      key={member.id}
                      member={member}
                      showWorkload={false}
                    />
                  ))}
                </div>
              ) : (
                <AdvisorPlaceholderCard message="There is no advisor yet." />
              )}
            </div>

            <div>
              <h2 className="mb-3 text-lg font-semibold text-foreground">
                Instructor
              </h2>
              {instructorMembers.length > 0 ? (
                <div className="gap-4">
                  {instructorMembers.map((member) => (
                    <MemberCard
                      key={member.id}
                      member={member}
                      showWorkload={false}
                    />
                  ))}
                </div>
              ) : (
                <AdvisorPlaceholderCard message="There is no instructor yet." />
              )}
            </div>
          </div>

          {/* Regular members section */}
          {regularMembers.length === 0 ? (
            <p className="text-sm text-gray-400">
              No regular team members found for this project.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {regularMembers.map((member) => (
                <MemberCard key={member.id} member={member} />
              ))}
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}