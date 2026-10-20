import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Mail,
  AlertTriangle,
  Gauge,
  ShieldAlert,
  PenLineIcon,
  Users,
  Trophy,
} from "lucide-react";
import MemberDetailDrawer from "@/components/user/MemberDetailDrawer";
import type {
  ProjectMemberUserSnapshot,
  ProjectRole,
} from "@/types/project_member";
import type { MemberStatus } from "@/types/member_snapshot";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

type WorkloadStyle = { label: string; badge: string; bar: string; text: string };

const roleStyles: Record<ProjectRole, string> = {
  admin: "border-purple-400 text-purple-600 bg-purple-50 dark:bg-purple-950/20",
  advisor: "border-blue-400 text-blue-600 bg-blue-50 dark:bg-blue-950/20",
  instructor:
    "border-indigo-400 text-indigo-600 bg-indigo-50 dark:text-blue-300 dark:bg-indigo-950/20",
  leader:
    "border-orange-400 text-orange-600 bg-orange-50 dark:bg-orange-950/20",
  member:
    "border-gray-400 text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-800/40",
};

export const workloadStyles: Record<MemberStatus, WorkloadStyle> = {
  overloaded: {
    label: "Overloaded",
    badge: "border-red-400 text-red-500 bg-red-50 dark:bg-red-950/20",
    bar: "bg-red-500",
    text: "text-red-500",
  },
  underutilized: {
    label: "Underutilized",
    badge:
      "border-yellow-400 text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20",
    bar: "bg-yellow-400",
    text: "text-yellow-600",
  },
  normal: {
    label: "Normal",
    badge: "border-green-400 text-green-600 bg-green-50 dark:bg-green-950/20",
    bar: "bg-green-500",
    text: "text-green-600",
  },
};

function getInitials(first: string, last: string) {
  return `${first?.trim()?.[0] ?? ""}${last?.trim()?.[0] ?? ""}`.toUpperCase();
}

// Progress bar fill: current points / expected points, capped at 100%.
// If expected points is 0 (or missing), show full when there is any workload,
// otherwise empty. Same rule as the Member Workload card on the Workload page.
function workloadPercent(points: number, expectedPoints: number) {
  if (expectedPoints > 0) {
    return Math.min(Math.max((points / expectedPoints) * 100, 0), 100);
  }
  return points > 0 ? 100 : 0;
}

function statusOf(member: ProjectMemberUserSnapshot): MemberStatus {
  return member.snapshots[0]?.workload_status ?? "normal";
}

// ---------------------------------------------------------------------------
// Contribution
//
// Read from the latest member snapshot (contribution_points). The points are
// added when a submission is approved: the task's complexity points
// (Low=1, Medium=2, High=3) go to every assigned member.
// ---------------------------------------------------------------------------

type Contributor = {
  id: string;
  name: string;
  initials: string;
  points: number;
};

function buildContributors(
  members: ProjectMemberUserSnapshot[],
): Contributor[] {
  return members
    .map((m) => ({
      id: m.id,
      name: `${m.user.first_name.trim()} ${m.user.last_name.trim()}`,
      initials: getInitials(m.user.first_name, m.user.last_name),
      points: m.snapshots[0]?.contribution_points ?? 0,
    }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function ContributionList({ contributors }: { contributors: Contributor[] }) {
  return (
    <Card className="rounded-xl border shadow-sm xl:sticky xl:top-4">
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-500" />
            <h2 className="text-lg font-semibold text-foreground">
              Contribution
            </h2>
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            Points
          </span>
        </div>

        {contributors.length === 0 ? (
          <p className="text-sm text-gray-400">No members yet.</p>
        ) : (
          <div className="flex h-106 flex-col gap-2 overflow-y-auto pr-1 custom-scrollbar">
            {contributors.map((person, index) => (
              <div
                key={person.id}
                className="flex h-16 shrink-0 items-center gap-3 rounded-lg border border-muted/40 bg-muted/5 px-3 dark:border-muted/40 dark:bg-muted/20"
              >
                <span className="w-4 text-center text-xs font-semibold text-gray-400 dark:text-gray-500">
                  {index + 1}
                </span>

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-gray-300 bg-primary dark:border-gray-600 dark:bg-gray-800">
                  <span className="text-xs font-bold text-primary-foreground dark:text-foreground">
                    {person.initials}
                  </span>
                </div>

                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-card-foreground">
                  {person.name}
                </span>

                <span className="text-lg font-bold text-gray-800 dark:text-card-foreground">
                  {person.points}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatTile({
  icon,
  label,
  value,
  chipClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  chipClass: string;
}) {
  return (
    <Card className="rounded-xl border shadow-sm">
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${chipClass}`}
        >
          {icon}
        </div>

        <div className="flex flex-col">
          <span className="text-2xl font-bold leading-none text-gray-800 dark:text-card-foreground">
            {value}
          </span>
          <span className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            {label}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function LeaderCard({ member }: { member: ProjectMemberUserSnapshot }) {
  const { user, project_role } = member;
  const snapshot = member.snapshots[0];
  const initials = getInitials(user.first_name, user.last_name);

  return (
    <Card className="rounded-xl border shadow-sm">
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-gray-300 bg-primary dark:border-gray-600 dark:bg-gray-800">
            <span className="text-xs font-bold text-primary-foreground dark:text-foreground">
              {initials}
            </span>
          </div>

          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-sm font-semibold text-card-foreground">
              {user.first_name.trim()} {user.last_name.trim()}
            </span>

            <span className="flex items-center gap-1 truncate text-xs text-gray-400 dark:text-gray-500">
              <Mail className="h-3 w-3 shrink-0" />
              {user.email}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {snapshot?.silence_warning && (
            <span
              title="No recent activity reported"
              className="flex items-center gap-1 rounded border border-red-400 bg-white px-2 py-1 text-xs font-semibold text-red-500 dark:bg-red-950/10"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              Silent
            </span>
          )}

          <span
            className={`rounded-full border px-2 py-0.5 text-xs capitalize ${roleStyles[project_role]}`}
          >
            {project_role}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function LeaderPlaceholderCard({ message }: { message: string }) {
  return (
    <Card className="rounded-xl border border-dashed shadow-sm">
      <CardContent className="flex h-20.5 items-center justify-center p-4 text-center text-sm text-gray-500 dark:text-gray-400">
        {message}
      </CardContent>
    </Card>
  );
}

function MemberCard({
  member,
  canEdit,
}: {
  member: ProjectMemberUserSnapshot;
  canEdit: boolean;
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

  const expectedPoints =
    snapshot !== undefined ? Number(snapshot.expected_points) : undefined;

  const workloadPct =
    points !== undefined ? workloadPercent(points, expectedPoints ?? 0) : 0;

  const workload = workloadStyles[snapshot?.workload_status ?? "normal"];
  const initials = getInitials(user.first_name, user.last_name);

  return (
    <Card className="rounded-xl border shadow-sm">
      <CardContent className="flex flex-col gap-4 m-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-gray-300 bg-primary dark:border-gray-600 dark:bg-gray-800">
              <span className="text-xs font-bold text-primary-foreground dark:text-foreground">
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

              <div className="flex flex-col gap-2">
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs w-fit capitalize ${roleStyles[project_role]}`}
                >
                  {project_role}
                </span>
                <span
                  className={`rounded border px-2 py-0.5 text-xs w-fit font-bold ${workload.badge}`}
                >
                  {workload.label.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {canEdit && (
            <MemberDetailDrawer
              member={member}
              trigger={
                <button
                  type="button"
                  aria-label={`View ${user.first_name} ${user.last_name}`}
                  className="text-gray-400 transition-colors hover:text-foreground"
                >
                  <PenLineIcon className="h-4 w-4" />
                </button>
              }
            />
          )}
        </div>

        {snapshot?.silence_warning && (
          <span
            title="No recent activity reported"
            className="flex w-fit items-center gap-1 rounded border border-red-400 bg-white px-2 py-0.5 text-xs font-semibold text-red-500 dark:bg-red-950/10"
          >
            <ShieldAlert className="h-3 w-3" />
            Silent
          </span>
        )}

        <div className="grid grid-cols-2 divide-x rounded-lg bg-gray-50 py-3 dark:bg-card-foreground/5">
          <div className="flex flex-col gap-1 px-4">
            <div className="flex items-center gap-1 text-blue-500">
              <Gauge className="h-3.5 w-3.5" />
              <span className="text-xs text-gray-400">Points</span>
            </div>
            <span className="text-xl font-bold text-gray-800 dark:text-card-foreground">
              {points !== undefined ? points : "—"}
            </span>
          </div>

          <div className="flex flex-col gap-1 px-4">
            <div className="flex items-center gap-1 text-gray-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="text-xs text-gray-400">Capacity</span>
            </div>
            <span className="text-xl font-bold text-gray-800 dark:text-card-foreground">
              {capacity !== undefined ? `${capacity.toFixed(1)}x` : "—"}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-card-foreground">Workload</span>

            <span className={`text-xs font-semibold ${workload.text}`}>
              {points !== undefined && expectedPoints !== undefined
                ? `${points.toFixed(1)} pts / ${expectedPoints.toFixed(1)}`
                : "No data"}
            </span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-400">
            <div
              className={`h-full rounded-full ${workload.bar}`}
              style={{ width: `${workloadPct}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Skeletons
// ---------------------------------------------------------------------------

function StatTileSkeleton() {
  return (
    <Card className="rounded-xl border shadow-sm">
      <CardContent className="flex items-center gap-3 p-4">
        <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-10" />
          <Skeleton className="h-3 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

function LeaderCardSkeleton() {
  return (
    <Card className="rounded-xl border shadow-sm">
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-40 max-w-full" />
          </div>
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </CardContent>
    </Card>
  );
}

function MemberCardSkeleton() {
  return (
    <Card className="rounded-xl border shadow-sm">
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-40 max-w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-20 rounded" />
              </div>
            </div>
          </div>
          <Skeleton className="h-4 w-4 shrink-0 rounded" />
        </div>

        <Skeleton className="h-17 w-full rounded-lg" />

        <div className="flex flex-col gap-2">
          <div className="flex justify-between">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-12" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

function ContributionListSkeleton() {
  return (
    <Card className="rounded-xl border shadow-sm">
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-3 w-10" />
        </div>

        <div className="flex h-106 flex-col gap-2 overflow-hidden">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div
              key={item}
              className="flex h-16 shrink-0 items-center gap-3 rounded-lg border px-3"
            >
              <Skeleton className="h-3 w-4" />
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-14" />
              </div>
              <Skeleton className="h-6 w-10" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/** Skeleton for the panel body (stats, leadership, members, contribution). */
export function TeamMembersSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <StatTileSkeleton key={item} />
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-24" />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <LeaderCardSkeleton />
          <LeaderCardSkeleton />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 w-80 max-w-full" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <MemberCardSkeleton key={item} />
            ))}
          </div>
        </div>

        <aside>
          <ContributionListSkeleton />
        </aside>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared panel
// ---------------------------------------------------------------------------

type TeamMembersPanelProps = {
  /** Result of useGetMembersWithUserSnapshot(projectId). */
  members: ProjectMemberUserSnapshot[];
  currentUserId: string;
};

export default function TeamMembersPanel({
  members,
  currentUserId,
}: TeamMembersPanelProps) {
  const advisorMembers = members.filter((m) => m.project_role === "advisor");
  const instructorMembers = members.filter(
    (m) => m.project_role === "instructor",
  );
  const regularMembers = members.filter(
    (m) => m.project_role !== "advisor" && m.project_role !== "instructor",
  );
  const currentMember = currentUserId
    ? members.find((m) => m.user.id === currentUserId)
    : undefined;
  const canEdit = currentMember?.project_role === "leader";

  const countBy = (status: MemberStatus) =>
    regularMembers.filter((m) => statusOf(m) === status).length;

  const contributors = buildContributors(regularMembers);

  return (
    <div className="flex flex-col gap-6">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          icon={<Users className="h-5 w-5" />}
          label="Regular members"
          value={regularMembers.length}
          chipClass="border-gray-400 text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-800/40"
        />
        <StatTile
          icon={<Gauge className="h-5 w-5" />}
          label="Normal workload"
          value={countBy("normal")}
          chipClass={workloadStyles.normal.badge}
        />
        <StatTile
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Overloaded"
          value={countBy("overloaded")}
          chipClass={workloadStyles.overloaded.badge}
        />
        <StatTile
          icon={<Gauge className="h-5 w-5" />}
          label="Underutilized"
          value={countBy("underutilized")}
          chipClass={workloadStyles.underutilized.badge}
        />
      </div>

      {/* Leadership */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">Leadership</h2>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {instructorMembers.length > 0 ? (
            instructorMembers.map((m) => <LeaderCard key={m.id} member={m} />)
          ) : (
            <LeaderPlaceholderCard message="There is no instructor yet." />
          )}

          {advisorMembers.length > 0 ? (
            advisorMembers.map((m) => <LeaderCard key={m.id} member={m} />)
          ) : (
            <LeaderPlaceholderCard message="There is no advisor yet." />
          )}
        </div>
      </section>

      {/* Members (left) + Contribution (right) */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-foreground">Members</h2>

          {regularMembers.length === 0 ? (
            <p className="text-sm text-gray-400">
              No regular team members found for this project.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {regularMembers.map((m) => (
                <MemberCard key={m.id} member={m} canEdit={canEdit} />
              ))}
            </div>
          )}
        </section>

        <aside>
          <ContributionList contributors={contributors} />
        </aside>
      </div>
    </div>
  );
}