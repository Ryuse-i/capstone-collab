import { useId } from "react";
import AppLayout from "@/layouts/Applayout";
import GetStartedPage from "@/components/user/GetStartedPage";
import { TriangleAlert, TrendingUp } from "lucide-react";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";

import { useGetCurrentProject } from "@/hooks/useProject";
import { useCurrentUser } from "@/hooks/useAuth";
import { useGetAllProjectTask } from "@/hooks/useTask";
import { useGetMemberActivities } from "@/hooks/useMemberActivity";
import { Link } from "react-router-dom"; // change if you use a different router
import { Button } from "@/components/ui/button";
import { useGetMembersWithUserSnapshot } from "@/hooks/useProjectMember";
import type { MemberStatus } from "@/types/member_snapshot";

// Task status distribution for the bar chart replacement
type TaskStatusDistribution = {
  not_started: number;
  in_progress: number;
  submitted: number;
  completed: number;
};

// ---------------------------------------------------------------------------
// Health level helpers
// ---------------------------------------------------------------------------

type HealthLevel = "good" | "warning" | "bad";

// Adjust these lists to match the exact status strings your backend returns.
const statusLevels: Record<HealthLevel, string[]> = {
  good: ["healthy", "good", "on_track", "on track"],
  warning: ["warning", "at_risk", "at risk", "caution", "moderate"],
  bad: ["critical", "bad", "unhealthy", "danger", "off_track", "off track"],
};

function getHealthLevel(status: string, score: number): HealthLevel {
  const normalized = String(status ?? "")
    .trim()
    .toLowerCase();

  if (statusLevels.good.includes(normalized)) return "good";
  if (statusLevels.warning.includes(normalized)) return "warning";
  if (statusLevels.bad.includes(normalized)) return "bad";

  // Fallback for unknown statuses: use the health score
  if (score >= 70) return "good";
  if (score >= 40) return "warning";
  return "bad";
}

const healthStyles: Record<
  HealthLevel,
  {
    border: string;
    icon: string;
    title: string;
    badge: string;
    heading: string;
  }
> = {
  good: {
    border: "border-green-500 dark:border-green-500",
    icon: "text-green-500",
    title: "text-green-700 dark:text-green-500",
    badge: "border-green-600 text-green-600",
    heading: "Project Health On Track",
  },
  warning: {
    border: "border-yellow-500 dark:border-yellow-500",
    icon: "text-yellow-500",
    title: "text-yellow-700 dark:text-yellow-500",
    badge: "border-yellow-600 text-yellow-600",
    heading: "Project Health Warning",
  },
  bad: {
    border: "border-red-500 dark:border-red-500",
    icon: "text-red-500",
    title: "text-red-700 dark:text-red-500",
    badge: "border-red-600 text-red-600",
    heading: "Project Health Alert",
  },
};

const workloadStyles: Record<MemberStatus, { bar: string; text: string }> = {
  overloaded: { bar: "bg-red-500", text: "text-red-500" },
  underutilized: { bar: "bg-yellow-400", text: "text-yellow-600" },
  normal: { bar: "bg-green-500", text: "text-green-600" },
};

// Project roles that supervise the project but don't carry workload.
const NON_MEMBER_ROLES = ["instructor", "advisor"];

// ---------------------------------------------------------------------------
// Health Ring (circular progress, maroon)
// ---------------------------------------------------------------------------

function HealthRing({
  value,
  size = 120,
  stroke = 10,
  label = "Project health",
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
}) {
  const gradientId = useId();
  const clamped = Math.min(Math.max(value, 0), 100);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: "#c4637d" }} />
            <stop offset="100%" style={{ stopColor: "var(--maroon)" }} />
          </linearGradient>
        </defs>

        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-gray-200 dark:stroke-white/10"
        />

        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke={`url(#${gradientId})`}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>

      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold text-foreground">
          {clamped.toFixed(0)}%
        </span>
        <span className="text-xs text-gray-500 dark:text-(--semi-foreground)">
          {label}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard Skeleton
// ---------------------------------------------------------------------------

function DashboardSkeleton() {
  return (
    <div>
      {/* Mirrors dashboard heading */}
      <Skeleton className="my-2 h-8 w-80" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* ── Project Health Banner ─────────────────────────────── */}
        <Card className="flex items-start justify-between rounded-lg border-4 p-4 lg:col-span-2">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-5 w-48" />
            </div>

            <Skeleton className="h-4 w-full max-w-130" />

            <Skeleton className="h-4 w-64" />

            <div className="flex gap-2">
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <Skeleton className="h-30 w-30 rounded-full" />
          </div>
        </Card>

        {/* ── Project Progress ──────────────────────────────────── */}
        <Card className="flex h-full flex-col justify-evenly rounded-lg p-4 shadow-sm">
          <div>
            <Skeleton className="h-5 w-56" />
            <Skeleton className="mt-2 h-4 w-40" />
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-4 w-28" />
            </div>

            <Skeleton className="mt-2 h-2 w-full rounded-full" />
          </div>

          <div className="flex flex-col gap-2 pt-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-10" />
            </div>

            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-14" />
            </div>
          </div>
        </Card>

        {/* ── Bar Chart ──────────────────────────────────────────── */}
        <Card className="rounded-lg p-4 shadow-sm">
          <div className="p-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="mt-2 h-4 w-32" />
          </div>

          <div className="mt-4 space-y-4">
            {["w-36", "w-52", "w-40", "w-20", "w-44", "w-48"].map(
              (width, index) => (
                <div key={index} className="flex items-center gap-3">
                  <Skeleton className="h-4 w-16 shrink-0" />
                  <Skeleton className={`h-5 ${width} rounded-md`} />
                </div>
              ),
            )}
          </div>
        </Card>

        {/* ── Recent Activity ───────────────────────────────────── */}
        <Card className="rounded-2xl border p-6 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="mt-2 h-4 w-56" />
            </div>

            <Skeleton className="h-7 w-28 rounded-full" />
          </div>

          <div className="space-y-1">
            {[1, 2, 3, 4, 5].map((item) => (
              <div
                key={item}
                className="flex items-start justify-between border-b border-gray-100 px-2 py-2 pb-4 last:border-none"
              >
                <div className="flex items-start gap-4">
                  <Skeleton className="mt-2 h-3 w-3 shrink-0 rounded-full" />

                  <div className="space-y-2">
                    <Skeleton className="h-4 w-72 max-w-[50vw]" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>

                <Skeleton className="h-3 w-12 shrink-0" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Dashboard() {
  const { data: user } = useCurrentUser();

  const {
    data: currentProject,
    isLoading,
    isError,
    error,
  } = useGetCurrentProject(user?.id ?? "");

  const {
    data: userTasks,
    isLoading: isTasksLoading,
    error: tasksError,
  } = useGetAllProjectTask(currentProject?.id ?? "");

  const { data: memberActivities, isLoading: isActivitiesLoading } =
    useGetMemberActivities(currentProject?.id ?? "");

  if (isError) {
    console.error("Dashboard project error", error);
  }

  if (tasksError) {
    console.error("Dashboard tasks error", tasksError);
  }

  const { data: members = [], isLoading: isMembersLoading } =
    useGetMembersWithUserSnapshot(currentProject?.id ?? "");

  const hasProject = Boolean(currentProject);

  // Keep the skeleton visible while project data is loading.
  // If a project exists, also wait for its snapshot before rendering
  // the dashboard analytics.
  const dataLoaded = !!currentProject && !!currentProject.snapshot;

  const isDashboardLoading =
    isLoading ||
    (!!currentProject && !currentProject.snapshot) ||
    isTasksLoading ||
    isActivitiesLoading ||
    isMembersLoading;

  const healthScore = currentProject?.snapshot?.health_score ?? 0;
  const healthStatus = currentProject?.snapshot?.health_status ?? "healthy";
  const scheduleVariance = currentProject?.snapshot?.schedule_variance ?? 0;
  const progressPercentage = currentProject?.snapshot?.progress_percentage ?? 0;
  const completedTasks = currentProject?.snapshot?.completed_tasks ?? 0;
  const totalWorkload = currentProject?.snapshot?.total_workload_points ?? 0;
  const expectedPercentage = currentProject?.snapshot?.expected_percentage ?? 0;

  const topMembers = members
    .filter(
      (member) =>
        !NON_MEMBER_ROLES.includes(member.project_role?.toLowerCase() ?? ""),
    )
    .map((member) => {
      const latest = member.snapshots[0];
      return {
        id: member.id,
        name: `${member.user.first_name} ${member.user.last_name}`.trim(),
        pts: latest ? Number(latest.total_effective_points) : 0,
        capacityMultiplier: latest ? Number(latest.capacity_multiplier) : 0,
        status: (latest?.workload_status ?? "normal") as MemberStatus,
      };
    })
    .sort((a, b) => b.pts - a.pts)
    .slice(0, 3);

  // Banner color/level: good = green, warning = yellow, bad = red
  const healthLevel = getHealthLevel(healthStatus, Number(healthScore));
  const healthStyle = healthStyles[healthLevel];
  const healthNeedsAttention = healthLevel !== "good";

  // Calculate task status distribution for the bar chart replacement
  const taskStatusDistribution: TaskStatusDistribution = {
    not_started: 0,
    in_progress: 0,
    submitted: 0,
    completed: 0,
  };

  userTasks?.forEach((task) => {
    if (task.status === "not_started") {
      taskStatusDistribution.not_started++;
    } else if (task.status === "in_progress") {
      taskStatusDistribution.in_progress++;
    } else if (task.status === "submitted") {
      taskStatusDistribution.submitted++;
    } else if (task.status === "completed") {
      taskStatusDistribution.completed++;
    }
  });

  // Prepare data for the task status bar chart
  const taskChartData = [
    { status: "Not Started", count: taskStatusDistribution.not_started },
    { status: "In Progress", count: taskStatusDistribution.in_progress },
    { status: "Submitted", count: taskStatusDistribution.submitted },
    { status: "Completed", count: taskStatusDistribution.completed },
  ];

  const taskChartConfig: ChartConfig = {
    count: { label: "Task Count", color: "var(--chart-1)" },
  };

  return (
    <AppLayout breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }]}>
      {isDashboardLoading ? (
        // Loading state
        <DashboardSkeleton />
      ) : !hasProject ? (
        // No project yet → show onboarding
        <GetStartedPage />
      ) : !dataLoaded ? (
        // Project exists but snapshot is still unavailable
        <DashboardSkeleton />
      ) : (
        // Active project → show analytics
        <div>
          <h1 className="my-2 text-2xl font-bold text-(--text-h) dark:text-card-foreground">
            Overview of project health and team performance
          </h1>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* ── Project Health Banner ─────────────────────────────── */}
            <Card
              className={`relative flex items-start justify-between rounded-lg border-4 p-4 lg:col-span-2 ${healthStyle.border}`}
            >
              {/* Status badge pinned to the top right corner */}
              <span
                className={`absolute right-4 top-4 rounded-full border px-3 py-1 text-xs capitalize ${healthStyle.badge}`}
              >
                {healthStatus}
              </span>

              {/* Left: heading + description */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  {healthNeedsAttention && (
                    <TriangleAlert className={`h-5 w-5 ${healthStyle.icon}`} />
                  )}
                  <h2 className={`font-semibold ${healthStyle.title}`}>
                    {healthStyle.heading}
                  </h2>
                </div>

                <p className="text-sm text-gray-500 dark:text-card-foreground">
                  {scheduleVariance < 0 && healthNeedsAttention
                    ? "The project is behind schedule and its overall health needs attention."
                    : scheduleVariance < 0
                      ? "The project is behind schedule. Review task progress and deadlines."
                      : healthNeedsAttention
                        ? "The project's overall health needs attention. Review workload and task progress."
                        : "Project is on track. Keep up the great work!"}
                </p>
              </div>

              {/* Right: health score ring, pushed below the badge */}
              <div className="mt-8">
                <HealthRing value={Number(healthScore)} />
              </div>
            </Card>

            {/* ── Project Progress ──────────────────────────────────── */}
            <Card className="flex h-full flex-col justify-evenly rounded-lg p-4 shadow-sm">
              <div>
                <h2 className="font-semibold text-foreground dark:text-card-foreground">
                  {currentProject?.name}
                </h2>

                <p className="text-sm text-gray-500 dark:text-(--semi-foreground)">
                  Overall completion tracking
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700 dark:text-card-foreground">
                    {progressPercentage}%
                  </span>

                  <span className="text-gray-500 dark:text-card-foreground">
                    {Number(completedTasks).toFixed(0)} pts / {totalWorkload}{" "}
                    total
                  </span>
                </div>

                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-yellow-400 transition-all duration-500"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1 pt-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 dark:text-card-foreground">
                    EXPECTED SCORE:
                  </span>

                  <span className="text-sm font-bold text-green-500">
                    {expectedPercentage ?? 0}%
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 dark:text-card-foreground">
                    SCHEDULE VARIANCE:
                  </span>

                  <span
                    className={`text-sm font-bold ${
                      Number(scheduleVariance) >= 0
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
                  >
                    {Number(scheduleVariance).toFixed(2)}
                  </span>
                </div>
              </div>
            </Card>

            {/* ── Member Workload ───────────────────────────────────── */}
            <Card className="flex h-full flex-col rounded-lg p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold text-foreground dark:text-card-foreground">
                    Member Workload
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-(--semi-foreground)">
                    Top members by workload points
                  </p>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-4 pt-4">
                {topMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No member snapshot data available.
                  </p>
                ) : (
                  topMembers.map((member) => {
                    const pct = Math.min(
                      Math.max(member.capacityMultiplier * 50, 0),
                      100,
                    );
                    const style =
                      workloadStyles[member.status] ?? workloadStyles.normal;

                    return (
                      <div key={member.id} className="flex flex-col gap-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-card-foreground">
                            {member.name}
                          </span>
                          <span
                            className={`text-xs font-semibold ${style.text}`}
                          >
                            {member.pts.toFixed(1)} pts ·{" "}
                            {member.capacityMultiplier.toFixed(1)}x
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
              </div>
              <div className="bottom-0 flex justify-center">
                <Button asChild variant="outline" size="sm">
                  <Link to="/workload">See all</Link>
                </Button>
              </div>
            </Card>

            {/* ── Task Status Distribution ────────────────────────── */}
            <Card className="rounded-lg p-4 shadow-sm lg:col-span-2">
              <CardHeader className="flex justify-between">
                <div>
                  <CardTitle>Task Status Distribution</CardTitle>
                  <CardDescription>
                    Current project task breakdown
                  </CardDescription>
                </div>
                <div className="item-center ">
                  Total tasks:{" "}
                  <span className="rounded-full bg-(--maroon) px-3 py-1 text-sm font-medium text-white">
                    {userTasks?.length ?? 0}
                  </span>
                </div>
              </CardHeader>

              <CardContent>
                <ChartContainer
                  config={taskChartConfig}
                  className="min-h-[200px] w-full h-[200px]"
                >
                  <BarChart
                    accessibilityLayer
                    data={taskChartData}
                    layout="vertical"
                    margin={{ left: 30 }}
                  >
                    <YAxis
                      dataKey="status"
                      type="category"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                    />
                    <XAxis type="number" allowDecimals={false} hide />

                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel />}
                    />

                    <Bar
                      dataKey="count"
                      fill="var(--primary)"
                      radius={[5, 5, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* ── Recent Activity ───────────────────────────────────── */}
            <Card className="rounded-2xl border p-6 shadow-sm lg:col-span-3">
              <div className="mb-1 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    Recent Activity
                  </h2>

                  <p className="text-sm text-gray-500 dark:text-(--semi-foreground)">
                    Latest team updates and progress
                  </p>
                </div>

                <div className="flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-600">
                  <TrendingUp className="h-4 w-4" />
                  Active Team
                </div>
              </div>

              {isActivitiesLoading ? (
                <div className="space-y-1">
                  {[1, 2, 3, 4, 5].map((item) => (
                    <div
                      key={item}
                      className="flex items-start justify-between border-b border-gray-100 px-2 py-2 pb-4 last:border-none"
                    >
                      <div className="flex items-start gap-4">
                        <Skeleton className="mt-2 h-3 w-3 shrink-0 rounded-full" />

                        <div className="space-y-2">
                          <Skeleton className="h-4 w-72 max-w-[50vw]" />
                          <Skeleton className="h-3 w-40" />
                        </div>
                      </div>

                      <Skeleton className="h-3 w-12 shrink-0" />
                    </div>
                  ))}
                </div>
              ) : memberActivities === null ||
                memberActivities === undefined ? (
                <div className="text-center py-4 text-gray-500">
                  No activities
                </div>
              ) : memberActivities.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  No recent activities to display
                </div>
              ) : (
                <div className="space-y-1">
                  {memberActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start justify-between rounded-lg border-b border-gray-100 px-2 py-2 pb-4 transition last:border-none hover:bg-gray-200 dark:hover:bg-[#303233]"
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`mt-2 h-3 w-3 rounded-full ${activity.color}`}
                        />

                        <div>
                          <p className="text-sm text-gray-700 dark:text-(--semi-foreground)">
                            <span className="font-semibold text-foreground">
                              {activity.user}
                            </span>{" "}
                            <span className={`${activity.text} font-semibold`}>
                              {activity.action}
                            </span>{" "}
                            <span className="font-medium text-black dark:text-card-foreground">
                              {activity.task}
                            </span>
                          </p>

                          <p className="mt-1 text-xs text-gray-400">
                            Team collaboration update
                          </p>
                        </div>
                      </div>

                      <span className="whitespace-nowrap text-xs text-gray-400">
                        {activity.time}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </AppLayout>
  );
}