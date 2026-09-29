import AppLayout from "@/layouts/Applayout";
import { TriangleAlert, ArrowRight, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useCurrentUser } from "@/hooks/useAuth";
import { useGetCurrentProject } from "@/hooks/useProject";
import { useGetMembersWithUserSnapshot } from "@/hooks/useProjectMember";
import { useGetAllTaskAssignedMembers } from "@/hooks/useTask";
import { useGetProjectRecommendations } from "@/hooks/useRedistributionRecommendation";
import type { MemberStatus } from "@/types/member_snapshot";

const complexityColors = {
  high: "#ef4444",
  medium: "#eab308",
  low: "#22c55e",
} as const;

const workloadStyles: Record<MemberStatus, { bar: string; text: string }> = {
  overloaded: { bar: "bg-red-500", text: "text-red-500" },
  underutilized: { bar: "bg-yellow-400", text: "text-yellow-600" },
  normal: { bar: "bg-green-500", text: "text-green-600" },
};

// Project roles that supervise the project but don't carry workload.
const NON_MEMBER_ROLES = ["instructor", "advisor"];

function memberName(member: {
  user: { first_name: string; last_name: string };
}) {
  return `${member.user.first_name} ${member.user.last_name}`.trim();
}

// ---------------------------------------------------------------------------
// Loading Skeleton
// ---------------------------------------------------------------------------

function WorkloadSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* ── Page Heading ──────────────────────────────────────────── */}
      <div className="lg:col-span-2">
        <Skeleton className="my-2 h-8 w-96 max-w-full" />
      </div>

      {/* ── Workload Health Banner ───────────────────────────────── */}
      <Card className="flex items-start justify-between rounded-lg border-4 p-4 lg:col-span-2">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-5 w-64" />
          </div>

          <Skeleton className="h-4 w-96 max-w-full" />

          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        </div>
      </Card>

      {/* ── Stat Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <Card key={item} className="rounded-xl border shadow-sm">
            <CardContent className="flex flex-col gap-3 p-5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Member Workload ──────────────────────────────────────── */}
      <Card className="rounded-xl border shadow-sm">
        <CardHeader>
          <Skeleton className="h-5 w-36" />
        </CardHeader>

        <CardContent className="flex flex-col gap-5">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-4">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-36" />
              </div>

              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── Task Complexity Distribution ─────────────────────────── */}
      <Card className="rounded-xl border shadow-sm">
        <CardHeader>
          <Skeleton className="h-5 w-56" />
        </CardHeader>

        <CardContent>
          <div className="flex items-center justify-center py-2">
            <Skeleton className="h-44 w-44 rounded-full" />
          </div>

          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            {[1, 2, 3].map((item) => (
              <div key={item} className="flex flex-col items-center gap-2">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-3 w-14" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Redistribution Recommendations ───────────────────────── */}
      <Card className="rounded-xl border shadow-sm lg:col-span-2">
        <CardHeader>
          <Skeleton className="h-5 w-64" />
        </CardHeader>

        <CardContent className="flex flex-col gap-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="flex flex-col gap-2 rounded-lg border p-4"
            >
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-7 rounded" />
                <Skeleton className="h-5 w-24 rounded" />
              </div>

              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />

              <Skeleton className="h-3 w-40" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Workload() {
  const { data: user } = useCurrentUser();

  const {
    data: project,
    isLoading: isProjectLoading,
    isError: isProjectError,
    error: projectErrorObj,
  } = useGetCurrentProject(user?.id ?? "");

  const projectId = project?.id ?? "";

  const {
    data: members = [],
    isLoading: isMembersLoading,
    isError: isMembersError,
    error: membersErrorObj,
  } = useGetMembersWithUserSnapshot(projectId);

  const {
    data: tasks = [],
    isLoading: isTasksLoading,
    isError: isTasksError,
    error: tasksErrorObj,
  } = useGetAllTaskAssignedMembers(projectId);

  const {
    data: recommendations = [],
    isLoading: isRecommendationsLoading,
    isError: isRecommendationsError,
    error: recommendationsErrorObj,
  } = useGetProjectRecommendations(projectId);

  const snapshot = project?.snapshot;

  const memberWorkload = members
    .filter(
      (member) =>
        !NON_MEMBER_ROLES.includes(member.project_role?.toLowerCase() ?? ""),
    )
    .map((member) => {
      const latestSnapshot = member.snapshots[0];

      const points = latestSnapshot
        ? Number(latestSnapshot.total_effective_points)
        : 0;

      const capacityMultiplier = latestSnapshot
        ? Number(latestSnapshot.capacity_multiplier)
        : 0;

      return {
        name: memberName(member),
        pts: points,
        capacityMultiplier,
        status: latestSnapshot?.workload_status ?? "normal",
      };
    });

  const complexityCounts = tasks.reduce(
    (counts, task) => {
      const complexity = task.complexity ?? "low";
      counts[complexity] += 1;
      return counts;
    },
    { high: 0, medium: 0, low: 0 },
  );

  const totalComplexityTasks =
    complexityCounts.high +
    complexityCounts.medium +
    complexityCounts.low;

  const complexityData = (["high", "medium", "low"] as const).map(
    (complexity) => ({
      name: `${complexity[0].toUpperCase()}${complexity.slice(1)} Complexity`,
      value:
        totalComplexityTasks === 0
          ? 0
          : (complexityCounts[complexity] / totalComplexityTasks) * 100,
      count: complexityCounts[complexity],
      color: complexityColors[complexity],
    }),
  );

  const overloadedCount = memberWorkload.filter(
    (member) => member.status === "overloaded",
  ).length;

  const underutilizedCount = memberWorkload.filter(
    (member) => member.status === "underutilized",
  ).length;

  const severity = snapshot?.imbalance_severity ?? "low";
  const isBad = severity === "high" || severity === "critical";

  const isLoading =
    isProjectLoading ||
    (!!projectId &&
      (isMembersLoading || isTasksLoading || isRecommendationsLoading));

  const isError =
    isProjectError ||
    (!!projectId && (isMembersError || isTasksError || isRecommendationsError));

  const errorMessage = (
    projectErrorObj ??
    membersErrorObj ??
    tasksErrorObj ??
    recommendationsErrorObj
  )?.message;

  return (
    <AppLayout breadcrumbs={[{ label: "Workload", href: "/workload" }]}>
      {isError ? (
        <div className="flex h-screen flex-col items-center justify-center gap-4">
          <AlertTriangle className="h-8 w-8 text-destructive" />

          <p className="text-foreground dark:text-muted-foreground">
            Failed to load project data. Please try again later.
          </p>

          {errorMessage && (
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
          )}
        </div>
      ) : isLoading ? (
        <WorkloadSkeleton />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <h1 className="my-2 text-2xl font-bold text-(--text-h) dark:text-card-foreground">
            Track and optimize task distribution across team members
          </h1>

          {/* ── Workload Health Banner ─────────────────────────────── */}
          <Card
            className={`flex items-start justify-between rounded-lg border-4 bg-card p-4 lg:col-span-2 ${
              isBad ? "border-red-500" : "border-yellow-500"
            }`}
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <TriangleAlert
                  className={`h-5 w-5 ${
                    isBad ? "text-red-500" : "text-yellow-500"
                  }`}
                />

                <h2
                  className={`font-semibold ${
                    isBad
                      ? "text-red-700 dark:text-red-500"
                      : "text-yellow-900 dark:text-yellow-500"
                  }`}
                >
                  {isBad
                    ? "Severe Workload Imbalance Detected"
                    : "Workload Balance Status"}
                </h2>
              </div>

              <p className="text-sm text-gray-500 dark:text-card-foreground">
                {snapshot
                  ? `${snapshot.imbalance_severity} imbalance based on the latest project snapshot.`
                  : "No workload snapshot is available yet."}
              </p>

              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border px-3 py-1 text-xs capitalize">
                  {severity}
                </span>

                <span className="rounded-full border px-3 py-1 text-xs">
                  {snapshot?.workload_balance ?? 0}% balance
                </span>
              </div>
            </div>
          </Card>

          {/* ── Summary Stats ──────────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-4">
            {[
              [
                "TOTAL WORKLOAD",
                `${snapshot?.total_workload_points ?? 0} PTS`,
                "ACROSS MEMBERS",
              ],
              [
                "AVG. PER MEMBER",
                `${Number(snapshot?.avg_workload ?? 0).toFixed(1)} PTS`,
                "CURRENT AVERAGE",
              ],
              [
                "OVERLOADED",
                overloadedCount.toString(),
                "MEMBERS OVER LIMIT",
              ],
              [
                "UNDERUTILIZED",
                underutilizedCount.toString(),
                "MEMBERS BELOW TARGET",
              ],
            ].map(([title, value, description]) => (
              <Card key={title} className="rounded-xl border shadow-sm">
                <CardContent className="flex flex-col gap-3 p-5">
                  <p className="text-xs font-medium tracking-wide text-card-foreground">
                    {title}
                  </p>

                  <h2 className="text-3xl font-bold text-card-foreground">
                    {value}
                  </h2>

                  <p className="text-xs text-card-foreground">
                    {description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ── Member Workload ────────────────────────────────────── */}
          <Card className="rounded-xl border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Member Workload
              </CardTitle>
            </CardHeader>

            <CardContent className="flex flex-col gap-4">
              {memberWorkload.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No member snapshot data available.
                </p>
              ) : (
                memberWorkload.map((member) => {
                  const pct = Math.min(
                    Math.max(member.capacityMultiplier * 50, 0),
                    100,
                  );

                  const style =
                    workloadStyles[member.status as MemberStatus];

                  return (
                    <div key={member.name} className="flex flex-col gap-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-card-foreground">
                          {member.name}
                        </span>

                        <span
                          className={`text-xs font-semibold ${style.text}`}
                        >
                          {member.pts.toFixed(1)} pts ·{" "}
                          {member.capacityMultiplier.toFixed(1)}x capacity
                        </span>
                      </div>

                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={`h-full rounded-full ${style.bar}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* ── Task Complexity Distribution ──────────────────────── */}
          <Card className="rounded-xl border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Task Complexity Distribution
              </CardTitle>
            </CardHeader>

            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={complexityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {complexityData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>

                  <Tooltip
                    formatter={(value) => [
                      `${Number(value).toFixed(0)}%`,
                      "",
                    ]}
                  />

                  <Legend
                    formatter={(value) => (
                      <span className="text-xs text-card-foreground">
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                {complexityData.map((item) => (
                  <div key={item.name}>
                    <span
                      className="text-2xl font-bold"
                      style={{ color: item.color }}
                    >
                      {item.count}
                    </span>

                    <span className="block text-xs text-card-foreground">
                      {item.name.replace(" Complexity", "")}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ── Redistribution Recommendations ────────────────────── */}
          {recommendations.length > 0 && (
            <Card className="rounded-xl border shadow-sm lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  Redistribution Recommendations
                </CardTitle>
              </CardHeader>

              <CardContent className="flex flex-col gap-3">
                {recommendations.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-2 rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                        {item.rank}
                      </span>

                      <span className="rounded border px-2 py-0.5 text-xs text-card-foreground">
                        {item.suggestion_type}
                      </span>
                    </div>

                    <p className="text-sm text-card-foreground">
                      {item.detail}
                    </p>

                    <p className="text-xs text-gray-400">
                      {item.expected_workload_after}{" "}
                      <ArrowRight className="inline h-3 w-3" />{" "}
                      {item.deadline_impact}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </AppLayout>
  );
}