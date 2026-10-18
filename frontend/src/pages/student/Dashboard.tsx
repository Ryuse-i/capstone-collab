import { useId } from "react";
import { Link } from "react-router-dom"; // change if you use a different router
import { TriangleAlert } from "lucide-react";
import { Bar, BarChart, Cell, XAxis, YAxis } from "recharts";

import AppLayout from "@/layouts/Applayout";
import GetStartedPage from "@/components/user/GetStartedPage";
import { Button } from "@/components/ui/button";
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
import { useGetMembersWithUserSnapshot } from "@/hooks/useProjectMember";
import { useProjectHealth } from "@/hooks/useProjectHealth"; // adjust path
import type { MemberStatus } from "@/types/member_snapshot";
import type { HealthStatus, ProjectHealth } from "@/types/projectHealth"; // adjust path
import { InviteLinkPopover } from "@/components/user/InviteLinkPopover";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ROUTES = {
  tasks: "/project-task",
  members: "/team",
};

// Sub-score bands: 80+ healthy, 60-79 watch, below 60 at risk.
const GOOD_MIN = 80;
const WARNING_MIN = 60;

// Project roles that supervise the project but don't carry workload.
const NON_MEMBER_ROLES = ["instructor", "advisor"];

// ---------------------------------------------------------------------------
// Health level helpers
// ---------------------------------------------------------------------------

type HealthLevel = "good" | "warning" | "bad";

const statusToLevel: Record<HealthStatus, HealthLevel> = {
  healthy: "good",
  watch: "warning",
  at_risk: "bad",
};

const statusLabel: Record<HealthStatus, string> = {
  healthy: "Healthy",
  watch: "Watch",
  at_risk: "At Risk",
};

const statusRank: Record<HealthStatus, number> = {
  healthy: 0,
  watch: 1,
  at_risk: 2,
};

function scoreToLevel(score: number | null): HealthLevel | null {
  if (score === null) return null;
  if (score >= GOOD_MIN) return "good";
  if (score >= WARNING_MIN) return "warning";
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
    message: string;
    bar: string;
    text: string;
  }
> = {
  good: {
    border: "border-green-500 dark:border-green-500",
    icon: "text-green-500",
    title: "text-green-700 dark:text-green-500",
    badge: "border-green-600 text-green-600",
    heading: "Project Health On Track",
    message: "Project is on track. Keep up the great work!",
    bar: "bg-green-500",
    text: "text-green-600",
  },
  warning: {
    border: "border-yellow-500 dark:border-yellow-500",
    icon: "text-yellow-500",
    title: "text-yellow-700 dark:text-yellow-500",
    badge: "border-yellow-600 text-yellow-600",
    heading: "Project Health: Watch",
    message:
      "Some health indicators need a closer look. See what needs attention below.",
    bar: "bg-yellow-400",
    text: "text-yellow-600",
  },
  bad: {
    border: "border-red-500 dark:border-red-500",
    icon: "text-red-500",
    title: "text-red-700 dark:text-red-500",
    badge: "border-red-600 text-red-600",
    heading: "Project Health: At Risk",
    message: "The project is at risk. See what needs attention below.",
    bar: "bg-red-500",
    text: "text-red-600",
  },
};

const workloadStyles: Record<MemberStatus, { bar: string; text: string }> = {
  overloaded: { bar: "bg-red-500", text: "text-red-500" },
  underutilized: { bar: "bg-yellow-400", text: "text-yellow-600" },
  normal: { bar: "bg-green-500", text: "text-green-600" },
};

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

const toPct = (ratio: number) => Math.round(ratio * 100);

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

const formatPoints = (n: number) =>
  Number.isInteger(n) ? String(n) : n.toFixed(1);

/** Explains why the status is worse than the score alone would give. */
function getOverrideExplanation(health: ProjectHealth): string | null {
  if (statusRank[health.status] <= statusRank[health.base_status]) return null;

  const reasons: string[] = [];

  if (health.overrides_applied.includes("overdue_rate")) {
    reasons.push(
      `${toPct(health.schedule.overdue_rate)}% of open tasks are overdue`,
    );
  }
  if (health.overrides_applied.includes("chronic_escalation")) {
    reasons.push(
      `${plural(
        health.risk.chronic_count,
        "member is",
        "members are",
      )} chronically overloaded`,
    );
  }

  const scoreText =
    health.score === null
      ? ""
      : ` (score alone: ${Math.round(health.score)}, ${statusLabel[health.base_status]})`;

  if (reasons.length === 0) {
    return `${statusLabel[health.status]} due to an override rule${scoreText}`;
  }

  return `${statusLabel[health.status]} because ${reasons.join(" and ")}${scoreText}`;
}

// ---------------------------------------------------------------------------
// "What needs attention" items
// ---------------------------------------------------------------------------

type AttentionItem = {
  key: string;
  score: number;
  message: string;
  href: string;
};

function getAttentionItems(health: ProjectHealth): AttentionItem[] {
  const { schedule, balance, risk, activity } = health;

  const scheduleMessage =
    schedule.overdue_tasks > 0
      ? `${plural(schedule.overdue_tasks, "task", "tasks")} overdue`
      : schedule.spi !== null && schedule.spi < 1
        ? `Behind schedule`
        : schedule.at_risk_tasks > 0
          ? `${plural(schedule.at_risk_tasks, "task", "tasks")} due within 7 days`
          : "Schedule is slipping";

  const workloadMessage =
    balance.overloaded_count > 0
      ? `${plural(balance.overloaded_count, "member", "members")} overloaded`
      : "Work is unevenly spread across the team";

  const riskMessage =
    risk.chronic_count > 0
      ? `${plural(risk.chronic_count, "member", "members")} chronically overloaded`
      : risk.unassigned_count > 0
        ? `${plural(risk.unassigned_count, "task", "tasks")} unassigned`
        : risk.spof_count > 0
          ? `${plural(risk.spof_count, "task", "tasks")} depend on a single member`
          : "Delivery risk is elevated";

  const activityMessage = `${plural(
    activity.stale_in_progress,
    "task",
    "tasks",
  )} stalled in progress`;

  const candidates: Array<{
    key: string;
    score: number | null;
    message: string;
    href: string;
  }> = [
    {
      key: "schedule",
      score: health.schedule_score,
      message: scheduleMessage,
      href: ROUTES.tasks,
    },
    {
      key: "workload",
      score: health.workload_balance_score,
      message: workloadMessage,
      href: ROUTES.members,
    },
    {
      key: "risk",
      score: health.risk_score,
      message: riskMessage,
      href: ROUTES.members,
    },
    {
      key: "activity",
      score: health.activity_score,
      message: activityMessage,
      href: ROUTES.tasks,
    },
  ];

  const items: AttentionItem[] = [];
  for (const c of candidates) {
    if (c.score !== null && c.score < GOOD_MIN) {
      items.push({
        key: c.key,
        score: c.score,
        message: c.message,
        href: c.href,
      });
    }
  }

  return items.sort((a, b) => a.score - b.score).slice(0, 2);
}

// ---------------------------------------------------------------------------
// Health Ring (circular progress, maroon)
// ---------------------------------------------------------------------------

function HealthRing({
  value,
  size = 120,
  stroke = 10,
  label = "Health score",
}: {
  value: number | null;
  size?: number;
  stroke?: number;
  label?: string;
}) {
  const gradientId = useId();
  const clamped = Math.min(Math.max(value ?? 0, 0), 100);
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

        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-gray-200 dark:stroke-white/10"
        />

        {value !== null && (
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
        )}
      </svg>

      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold text-foreground">
          {value === null ? "N/A" : Math.round(clamped)}
        </span>
        <span className="text-xs text-gray-500 dark:text-(--semi-foreground)">
          {value === null ? label : `/ 100`}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeletons (each mirrors the real section's layout and grid span)
// ---------------------------------------------------------------------------

function BannerSkeleton() {
  return (
    <Card className="relative flex flex-row items-start justify-between rounded-lg border-4 border-gray-200 p-4 lg:col-span-2 dark:border-gray-700">
      <Skeleton className="absolute right-4 top-4 h-6 w-16 rounded-full" />

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-5 w-48" />
        </div>
        <Skeleton className="h-4 w-full max-w-130" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="mt-8">
        <Skeleton className="h-30 w-30 rounded-full" />
      </div>
    </Card>
  );
}

function ProgressSkeleton() {
  return (
    <Card className="flex h-full flex-col justify-evenly rounded-lg p-4 shadow-sm">
      <div>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-2 h-4 w-48" />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="mt-2 h-2 w-full rounded-full" />
      </div>
      <div className="flex flex-col gap-2 pt-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-3 w-full max-w-64" />
      </div>
    </Card>
  );
}

function TilesSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-3 lg:grid-cols-4">
      {[1, 2, 3, 4].map((item) => (
        <Card key={item} className="gap-2 rounded-lg p-4 shadow-sm">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-2 w-full rounded-full" />
          <Skeleton className="h-3 w-40" />
        </Card>
      ))}
    </div>
  );
}

function AttentionSkeleton() {
  return (
    <Card className="gap-2 rounded-lg p-4 shadow-sm lg:col-span-3">
      <Skeleton className="h-5 w-40" />
      <div className="space-y-1">
        {[1, 2].map((item) => (
          <div
            key={item}
            className="flex items-center justify-between px-2 py-2"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-4 w-56" />
            </div>
            <Skeleton className="h-4 w-4" />
          </div>
        ))}
      </div>
    </Card>
  );
}

function WorkloadSkeleton() {
  return (
    <Card className="flex h-full flex-col rounded-lg p-4 shadow-sm">
      <div>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-2 h-4 w-48" />
      </div>
      <div className="flex flex-1 flex-col gap-4 pt-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-1">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
      <div className="flex justify-center">
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>
    </Card>
  );
}

function TaskChartSkeleton() {
  return (
    <Card className="rounded-lg p-4 shadow-sm lg:col-span-2">
      <div className="flex items-start justify-between px-6">
        <div>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="mt-2 h-4 w-56" />
        </div>
        <Skeleton className="h-7 w-32 rounded-full" />
      </div>
      <div className="h-65 min-h-50 space-y-6 px-6 pt-4">
        {["w-36", "w-52", "w-40", "w-20"].map((w, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-4 w-20 shrink-0" />
            <Skeleton className={`h-6 ${w} rounded-md`} />
          </div>
        ))}
      </div>
    </Card>
  );
}

function ActivitySkeleton() {
  return (
    <Card className="rounded-2xl border p-6 shadow-sm lg:col-span-3">
      <div className="mb-1 flex items-center justify-between">
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
            className="flex items-start justify-between px-2 py-2 pb-4"
          >
            <div className="flex items-start gap-4">
              <Skeleton className="mt-2 h-3 w-3 shrink-0 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-72 max-w-[50vw]" />
              </div>
            </div>
            <Skeleton className="h-3 w-12 shrink-0" />
          </div>
        ))}
      </div>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div>
      <Skeleton className="my-2 h-8 w-80" />

      {/* Same grid + same order as the loaded dashboard */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <BannerSkeleton />
        <ProgressSkeleton />
        <TilesSkeleton />
        <AttentionSkeleton />
        <WorkloadSkeleton />
        <TaskChartSkeleton />
        <ActivitySkeleton />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Health banner (ring layout, health-model data)
// ---------------------------------------------------------------------------

function HealthBanner({ health }: { health: ProjectHealth }) {
  const level = statusToLevel[health.status];
  const style = healthStyles[level];
  const needsAttention = level !== "good";
  const overrideText = getOverrideExplanation(health);

  return (
    <Card
      className={`relative flex flex-row items-start justify-between rounded-lg border-4 p-4 lg:col-span-2 ${style.border}`}
    >
      <span
        className={`absolute right-4 top-4 rounded-full border px-3 py-1 text-xs ${style.badge}`}
      >
        {statusLabel[health.status]}
      </span>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          {needsAttention && (
            <TriangleAlert className={`h-5 w-5 ${style.icon}`} />
          )}
          <h2 className={`font-semibold ${style.title}`}>{style.heading}</h2>
        </div>

        <p className="text-sm text-gray-500 dark:text-card-foreground">
          {overrideText ?? style.message}
        </p>
      </div>

      <div className="mt-8">
        <HealthRing value={health.score} />
      </div>
    </Card>
  );
}

function HealthBannerMessage({
  title,
  description,
  onRetry,
}: {
  title: string;
  description: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="flex flex-row items-center justify-between rounded-lg border-4 border-gray-300 p-4 lg:col-span-2 dark:border-gray-600">
      <div className="flex flex-col gap-1">
        <h2 className="font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-gray-500 dark:text-card-foreground">
          {description}
        </p>
      </div>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border px-3 py-1 text-sm text-foreground hover:bg-gray-100 dark:hover:bg-[#303233]"
        >
          Retry
        </button>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Sub-score tiles
// ---------------------------------------------------------------------------

function ScoreTile({
  title,
  score,
  detail,
}: {
  title: string;
  score: number | null;
  detail: string;
}) {
  const level = scoreToLevel(score);
  const style = level ? healthStyles[level] : null;
  const width = score === null ? 0 : Math.max(0, Math.min(100, score));

  return (
    <Card className="gap-2 rounded-lg p-4 shadow-sm">
      <p className="text-sm font-medium text-gray-500 dark:text-(--semi-foreground)">
        {title}
      </p>

      <p
        className={`text-2xl font-bold ${style ? style.text : "text-gray-400"}`}
      >
        {score === null ? "N/A" : Math.round(score)}
      </p>

      <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${
            style ? style.bar : "bg-gray-300"
          }`}
          style={{ width: `${width}%` }}
        />
      </div>

      <p className="text-xs text-gray-500 dark:text-(--semi-foreground)">
        {detail}
      </p>
    </Card>
  );
}

function SubScoreTiles({ health }: { health: ProjectHealth }) {
  const { schedule, balance, risk, activity } = health;

  const scheduleDetail = schedule.applicable
    ? `${toPct(schedule.overdue_rate)}% overdue`
    : "No live tasks";

  const workloadDetail = balance.applicable
    ? `${balance.overloaded_count} overloaded · max load ${toPct(
        balance.max_load_ratio,
      )}%`
    : "No open workload";

  const riskDetail = `${risk.chronic_count} chronic · ${risk.unassigned_count} unassigned`;

  const activityDetail = activity.applicable
    ? `${activity.stale_in_progress} stalled`
    : "Nothing in progress";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-3 lg:grid-cols-4">
      <ScoreTile
        title="Schedule"
        score={health.schedule_score}
        detail={scheduleDetail}
      />
      <ScoreTile
        title="Workload balance"
        score={health.workload_balance_score}
        detail={workloadDetail}
      />
      <ScoreTile title="Risk" score={health.risk_score} detail={riskDetail} />
      <ScoreTile
        title="Activity"
        score={health.activity_score}
        detail={activityDetail}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// What needs attention
// ---------------------------------------------------------------------------

function AttentionList({ health }: { health: ProjectHealth }) {
  const items = getAttentionItems(health);
  const hasAnyScore = [
    health.schedule_score,
    health.workload_balance_score,
    health.risk_score,
    health.activity_score,
  ].some((s) => s !== null);

  return (
    <Card className="gap-2 rounded-lg p-4 shadow-sm lg:col-span-3">
      <h2 className="font-semibold text-foreground">What needs attention</h2>

      {items.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-(--semi-foreground)">
          {hasAnyScore
            ? "Nothing needs attention right now."
            : "Not enough data yet to highlight anything."}
        </p>
      ) : (
        <ul className="space-y-1">
          {items.map((item) => {
            const level = scoreToLevel(item.score) ?? "bad";
            const style = healthStyles[level];

            return (
              <li key={item.key}>
                <Link
                  to={item.href}
                  className="flex items-center justify-between rounded-lg px-2 py-2 text-sm transition hover:bg-gray-200 dark:hover:bg-[#303233]"
                >
                  <span className="flex items-center gap-3">
                    <span className={`h-3 w-3 rounded-full ${style.bar}`} />
                    <span className="text-gray-700 dark:text-card-foreground">
                      {item.message}
                    </span>
                  </span>
                  <span className="text-gray-400">→</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Project progress card
// ---------------------------------------------------------------------------

function ProgressCard({
  projectName,
  health,
}: {
  projectName: string | undefined;
  health: ProjectHealth | undefined;
}) {
  const header = (
    <div>
      {projectName ? (
        <h2 className="font-semibold text-foreground dark:text-card-foreground">
          {projectName}
        </h2>
      ) : (
        <Skeleton className="h-5 w-40" />
      )}
      <p className="text-sm text-gray-500 dark:text-(--semi-foreground)">
        Overall completion tracking
      </p>
    </div>
  );

  if (!health) {
    return (
      <Card className="flex h-full flex-col justify-evenly rounded-lg p-4 shadow-sm">
        {header}
        <p className="text-sm text-gray-500 dark:text-(--semi-foreground)">
          Progress unavailable
        </p>
      </Card>
    );
  }

  const { schedule } = health;
  const completion = schedule.completion_pct;
  const spi = schedule.spi;

  return (
    <Card className="flex h-full flex-col justify-evenly rounded-lg p-4 shadow-sm">
      {header}

      <div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700 dark:text-card-foreground">
            {completion === null ? "N/A" : `${Math.round(completion)}%`}
          </span>
          <span className="text-gray-500 dark:text-card-foreground">
            {formatPoints(schedule.completed_points)} pts /{" "}
            {formatPoints(schedule.total_points)} pts total
          </span>
        </div>

        <div className="h-2 w-full rounded-full bg-gray-200">
          <div
            className="h-2 rounded-full bg-yellow-400 transition-all duration-500"
            style={{ width: `${Math.max(0, Math.min(100, completion ?? 0))}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1 pt-4">
        <p className="text-xs text-gray-500 dark:text-(--semi-foreground)">
          {spi === null
            ? "No points were due yet, so schedule performance can't be measured."
            : `Earned ${formatPoints(schedule.earned_points)} of ${formatPoints(
                schedule.planned_points,
              )} points that were due.`}
        </p>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Chart data
// ---------------------------------------------------------------------------

type TaskStatusDistribution = {
  not_started: number;
  in_progress: number;
  submitted: number;
  completed: number;
};

const STATUS_BAR_COLOR = "var(--primary)";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Dashboard() {
  const { data: user, isLoading: isUserLoading } = useCurrentUser();

  // NOTE: disabled queries (empty id) report isLoading: false in React Query v5,
  // so we use isPending for the queries that depend on another query's result.
  const {
    data: currentProject,
    isPending: isProjectPending,
    isError,
    error,
  } = useGetCurrentProject(user?.id ?? "");

  const {
    data: projectTasks,
    isPending: isTasksPending,
    error: tasksError,
  } = useGetAllProjectTask(currentProject?.id ?? "");

  const {
    data: memberActivities,
    isLoading: isActivitiesLoading,
    isError: isActivitiesError,
  } = useGetMemberActivities(currentProject?.id ?? "");

  const { data: members = [], isPending: isMembersPending } =
    useGetMembersWithUserSnapshot(currentProject?.id ?? "");

  const {
    data: health,
    isLoading: isHealthLoading,
    isError: isHealthError,
    refetch: refetchHealth,
  } = useProjectHealth(currentProject?.id);

  if (isError) console.error("Dashboard project error", error);
  if (tasksError) console.error("Dashboard tasks error", tasksError);

  const hasProject = Boolean(currentProject);

  // One gate for the whole page: the skeleton stays up until the user, project,
  // and every section's data have resolved, so nothing pops in piecemeal.
  // (Disabled queries report isLoading: false, so they can't hang this.
  //  A failed health call resolves to isLoading: false and shows the
  //  "Health unavailable" message instead of keeping the skeleton up.)
  const isDashboardLoading =
    isUserLoading ||
    (Boolean(user) && isProjectPending) ||
    (hasProject &&
      (isHealthLoading ||
        isTasksPending ||
        isMembersPending ||
        isActivitiesLoading));

  // Top members by workload
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

  // UI gate only; the backend still has to enforce it
  const myRole = members.find((m) => m.user_id === user?.id)?.project_role;
  const canInvite = myRole === "leader" || myRole === "admin";

  // Project task status distribution
  const taskStatusDistribution: TaskStatusDistribution = {
    not_started: 0,
    in_progress: 0,
    submitted: 0,
    completed: 0,
  };

  projectTasks?.forEach((task) => {
    if (task.status === "not_started") taskStatusDistribution.not_started++;
    else if (task.status === "in_progress")
      taskStatusDistribution.in_progress++;
    else if (task.status === "submitted") taskStatusDistribution.submitted++;
    else if (task.status === "completed") taskStatusDistribution.completed++;
  });

  const taskChartData: Array<{ label: string; count: number; fill: string }> = [
    {
      label: "Not Started",
      count: taskStatusDistribution.not_started,
      fill: STATUS_BAR_COLOR,
    },
    {
      label: "In Progress",
      count: taskStatusDistribution.in_progress,
      fill: STATUS_BAR_COLOR,
    },
    {
      label: "Submitted",
      count: taskStatusDistribution.submitted,
      fill: STATUS_BAR_COLOR,
    },
    {
      label: "Completed",
      count: taskStatusDistribution.completed,
      fill: STATUS_BAR_COLOR,
    },
  ];

  const taskChartConfig: ChartConfig = {
    count: { label: "Task Count", color: "var(--chart-1)" },
  };

  return (
    <AppLayout breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }]}>
      {isDashboardLoading ? (
        <DashboardSkeleton />
      ) : !hasProject ? (
        <GetStartedPage />
      ) : (
        <div>
          <div className="my-2 flex items-center justify-between gap-4">
            <h1 className="text-2xl font-bold text-(--text-h) dark:text-card-foreground">
              Overview of project health and team performance
            </h1>
            {currentProject && canInvite && (
              <InviteLinkPopover projectId={currentProject.id ?? ""} />
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* ── Project Health Banner ─────────────────────────────── */}
            {isHealthError || !health ? (
              <HealthBannerMessage
                title="Health unavailable"
                description="We couldn't load the project health right now. The rest of the dashboard is unaffected."
                onRetry={() => void refetchHealth()}
              />
            ) : (
              <HealthBanner health={health} />
            )}

            {/* ── Project Progress ──────────────────────────────────── */}
            <ProgressCard projectName={currentProject?.name} health={health} />

            {/* ── Sub-score tiles + What needs attention ────────────── */}
            {health && (
              <>
                <SubScoreTiles health={health} />
                <AttentionList health={health} />
              </>
            )}

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
                    {health ? ", plus deadline counts" : ""}
                  </CardDescription>
                </div>
                <div className="item-center">
                  Total tasks:{" "}
                  <span className="rounded-full bg-(--maroon) px-3 py-1 text-sm font-medium text-white">
                    {projectTasks?.length ?? 0}
                  </span>
                </div>
              </CardHeader>

              <CardContent>
                <ChartContainer
                  config={taskChartConfig}
                  className="h-65 min-h-50 w-full"
                >
                  <BarChart
                    accessibilityLayer
                    data={taskChartData}
                    layout="vertical"
                    margin={{ left: 30 }}
                  >
                    <YAxis
                      dataKey="label"
                      type="category"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                    />
                    <XAxis
                      type="number"
                      dataKey="count"
                      allowDecimals={false}
                      hide
                    />

                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel />}
                    />

                    <Bar dataKey="count" radius={5}>
                      {taskChartData.map((entry) => (
                        <Cell key={entry.label} fill={entry.fill} />
                      ))}
                    </Bar>
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
              </div>

              {isActivitiesError ? (
                <div className="py-4 text-center text-gray-500">
                  Couldn't load recent activity right now.
                </div>
              ) : !memberActivities || memberActivities.length === 0 ? (
                <div className="py-4 text-center text-gray-500">
                  No recent activities to display
                </div>
              ) : (
                <div className="space-y-1">
                  {memberActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start justify-between rounded-lg border-b border-gray-100 px-2 py-2 transition last:border-none hover:bg-gray-200 dark:hover:bg-[#303233]"
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${activity.color}`}
                        />
                        <p className="text-sm text-gray-700 dark:text-(--semi-foreground)">
                          <span className="font-semibold text-foreground">
                            {activity.user}
                          </span>{" "}
                          <span className={`${activity.text} font-semibold`}>
                            {activity.action}
                          </span>
                          {activity.task && (
                            <>
                              {" "}
                              <span className="font-medium text-black dark:text-card-foreground">
                                {activity.task}
                              </span>
                            </>
                          )}
                        </p>
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
