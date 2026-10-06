import AppLayout from "@/layouts/Applayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Mail,
  AlertTriangle,
  Gauge,
  ShieldAlert,
  PenLineIcon,
} from "lucide-react";
import { useGetMembersWithUserSnapshot } from "@/hooks/useProjectMember";
import { useGetCurrentProject } from "@/hooks/useProject";
import { useCurrentUser } from "@/hooks/useAuth";
import MemberDetailDrawer from "@/components/user/MemberDetailDrawer";
import type {
  ProjectMemberUserSnapshot,
  ProjectRole,
} from "@/types/project_member";
import type { MemberStatus } from "@/types/member_snapshot";

type WorkloadStyle = { label: string; badge: string; bar: string };

const roleStyles: Record<ProjectRole, string> = {
  admin: "border-purple-400 text-purple-600 bg-purple-50 dark:bg-purple-950/20",
  advisor: "border-blue-400 text-blue-600 bg-blue-50 dark:bg-blue-950/20",
  instructor:
    "border-indigo-400 text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20",
  leader:
    "border-orange-400 text-orange-600 bg-orange-50 dark:bg-orange-950/20",
  member: "border-gray-400 text-gray-600 bg-gray-50 dark:bg-gray-800/40",
};

const workloadStyles: Record<MemberStatus, WorkloadStyle> = {
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
    <Card className="rounded-xl border shadow-sm">
      <CardContent
        className={`flex flex-col p-5 ${
          showWorkload ? "gap-4" : "gap-3"
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-gray-300 bg-primary dark:border-gray-600 dark:bg-gray-800">
              <span className="text-sm font-bold text-primary-foreground dark:text-foreground">
                {initials}
              </span>
            </div>

            <div className="flex min-w-0 flex-col gap-1">
              <span className="truncate text-sm font-semibold text-card-foreground">
                {user.first_name.trim()} {user.last_name.trim()}
              </span>

              <span className="flex items-center gap-1 truncate text-xs text-gray-400 dark:text-gray-500">
                <Mail className="h-3 w-3 shrink-0" />
                {user.email}
              </span>

              <span
                className={`w-fit rounded-full border px-2 py-0.5 text-xs capitalize ${roleStyles[project_role]}`}
              >
                {project_role}
              </span>
            </div>
          </div>

          {!showWorkload && snapshot?.silence_warning && (
            <span
              title="No recent activity reported"
              className="flex shrink-0 items-center gap-1 rounded border border-red-400 bg-white px-2 py-1 text-xs font-semibold text-red-500 dark:bg-red-950/10"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              Silent
            </span>
          )}

          {(project_role === "member" || project_role === "leader") &&(
            <MemberDetailDrawer
              member={member}
              trigger={
                <button
                  type="button"
                  aria-label={`View ${user.first_name} ${user.last_name}`}
                >
                  <PenLineIcon className="h-4 w-4" />
                </button>
              }
            />
          )}
        </div>

        {showWorkload && (
          <>
            {/* Workload status */}
            <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 dark:bg-card-foreground/5">
              <div>
                <p className="text-xs text-gray-400 dark:text-card-foreground">
                  Workload status
                </p>

                <p className="mt-0.5 text-sm font-semibold text-gray-800 dark:text-card-foreground">
                  {workload.label}
                </p>
              </div>

              <span
                className={`rounded border px-2 py-1 text-xs font-bold ${workload.badge}`}
              >
                {workload.label.toUpperCase()}
              </span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 border-b pb-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1 text-blue-500">
                  <Gauge className="h-3.5 w-3.5" />
                  <span className="text-xs text-gray-400">Points</span>
                </div>

                <span className="text-2xl font-bold text-gray-800 dark:text-card-foreground">
                  {points !== undefined ? points : "—"}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1 text-gray-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
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

              <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-400">
                <div
                  className={`h-full rounded-full ${workload.bar}`}
                  style={{
                    width: `${
                      capacity !== undefined ? capacityPercent(capacity) : 0
                    }%`,
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

// ---------------------------------------------------------------------------
// Loading Skeleton
// ---------------------------------------------------------------------------

function MemberCardSkeleton({ showWorkload = true }: { showWorkload?: boolean }) {
  return (
    <Card className="rounded-xl border shadow-sm">
      <CardContent
        className={`flex flex-col p-5 ${
          showWorkload ? "gap-4" : "gap-3"
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Skeleton className="h-12 w-12 shrink-0 rounded-full" />

            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-40 max-w-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>

          <Skeleton className="h-4 w-4 shrink-0 rounded" />
        </div>

        {showWorkload && (
          <>
            {/* Workload status */}
            <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 dark:bg-card-foreground/5">
              <div className="flex flex-col gap-1">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-0.5 h-4 w-20" />
              </div>

              <Skeleton className="h-6 w-20 rounded" />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 border-b pb-4">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-8 w-12" />
              </div>

              <div className="flex flex-col gap-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-8 w-12" />
              </div>
            </div>

            {/* Capacity */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-12" />
              </div>

              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function AdvisorPlaceholderCard({ message }: { message: string }) {
  return (
    <div className="grid h-34.5 grid-cols-1 gap-4">
      <Card className="rounded-xl border shadow-sm">
        <CardContent className="flex min-h-full items-center justify-center p-5 text-center text-sm text-gray-500 dark:text-gray-400">
          {message}
        </CardContent>
      </Card>
    </div>
  );
}

function TeamSkeleton() {
  return (
    <div>
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="mb-2 flex items-center justify-between">
        <Skeleton className="h-8 w-96 max-w-full" />
        <Skeleton className="h-4 w-28" />
      </div>

      {/* ── Instructor / Advisor ─────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div>
          <Skeleton className="mb-3 h-6 w-24" />

          <MemberCardSkeleton showWorkload={false} />
        </div>

        <div>
          <Skeleton className="mb-3 h-6 w-20" />

          <MemberCardSkeleton showWorkload={false} />
        </div>
      </div>

      {/* ── Regular Members ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <MemberCardSkeleton key={item} />
        ))}
      </div>
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
        <div className="flex h-screen flex-col items-center justify-center gap-4">
          <AlertTriangle className="h-8 w-8 text-destructive" />

          <p className="text-foreground dark:text-muted-foreground">
            Failed to load project data. Please try again later.
          </p>
        </div>
      ) : isLoading ? (
        <TeamSkeleton />
      ) : (
        <div>
          {/* Header */}
          <div className="mb-2 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">
              Manage members and monitor activities
            </h1>

            <span className="text-sm text-gray-400 dark:text-gray-500">
              {regularMembers.length} regular member
              {regularMembers.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Instructor / Advisor */}
          <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
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
          </div>

          {/* Regular members section */}
          {regularMembers.length === 0 ? (
            <p className="text-sm text-gray-400">
              No regular team members found for this project.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
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