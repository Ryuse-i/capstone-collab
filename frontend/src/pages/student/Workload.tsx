import { useState } from "react";
import AppLayout from "@/layouts/Applayout";
import {
  TriangleAlert,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
import {
  useGetProjectRecommendations,
  useGenerateRecommendations,
} from "@/hooks/useRedistributionRecommendation";
import {
  useRecalculateWorkloadBalance,
  useWorkloadBalanceBreakdown,
} from "@/hooks/useWorkloadBalance";
import type { MemberStatus } from "@/types/member_snapshot";
import { buildTaskLink, goLabels } from "@/lib/taskIntent";
import type {
  RecommendationType,
  RecommendationResponse,
} from "@/types/redistributionRecommendation";
import { SplitTaskDialog } from "@/components/user/SplitTaskDialog";

const complexityColors = {
  high: "#ef4444",
  medium: "#eab308",
  low: "#22c55e",
} as const;

const suggestionLabels: Record<RecommendationType, string> = {
  transfer: "Transfer",
  share: "Share",
  split: "Split",
  reschedule: "Reschedule",
};

const suggestionStyles: Record<RecommendationType, string> = {
  transfer:
    "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  share:
    "border-purple-500/40 bg-purple-500/10 text-purple-700 dark:text-purple-400",
  split:
    "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-400",
  reschedule:
    "border-yellow-500/40 bg-yellow-500/10 text-yellow-800 dark:text-yellow-400",
};

const workloadStyles: Record<MemberStatus, { bar: string; text: string }> = {
  overloaded: { bar: "bg-red-500", text: "text-red-500" },
  underutilized: { bar: "bg-yellow-400", text: "text-yellow-600" },
  normal: { bar: "bg-green-500", text: "text-green-600" },
};

// Banner colors by imbalance severity:
// green = good (low), yellow = warning (medium), red = severe (high/critical).
const bannerTones = {
  good: {
    border: "border-green-500",
    icon: "text-green-500",
    title: "text-green-700 dark:text-green-500",
    heading: "Workload Is Well Balanced",
  },
  warning: {
    border: "border-yellow-500",
    icon: "text-yellow-500",
    title: "text-yellow-900 dark:text-yellow-500",
    heading: "Workload Imbalance Warning",
  },
  severe: {
    border: "border-red-500",
    icon: "text-red-500",
    title: "text-red-700 dark:text-red-500",
    heading: "Severe Workload Imbalance Detected",
  },
  neutral: {
    border: "border-gray-300 dark:border-gray-600",
    icon: "text-gray-400",
    title: "text-card-foreground",
    heading: "Workload Balance Status",
  },
} as const;

function getBannerTone(severity: string, hasSnapshot: boolean) {
  if (!hasSnapshot) return bannerTones.neutral;

  switch (severity) {
    case "low":
      return bannerTones.good;
    case "high":
    case "critical":
      return bannerTones.severe;
    default:
      // "medium" (or any other in-between value)
      return bannerTones.warning;
  }
}

// Project roles that supervise the project but don't carry workload.
const NON_MEMBER_ROLES = ["instructor", "advisor"];

// Show the "split tasks" tip when high-complexity tasks are at least this
// share of all tasks, and there are enough tasks for the ratio to be meaningful.
const HIGH_COMPLEXITY_TIP_RATIO = 0.4;
const HIGH_COMPLEXITY_TIP_MIN_TASKS = 3;

function memberName(member: {
  user: { first_name: string; last_name: string };
}) {
  return `${member.user.first_name} ${member.user.last_name}`.trim();
}

// Progress bar fill: current points / expected points, capped at 100%.
// If expected points is 0 (or missing), show full when there is any workload,
// otherwise empty.
function workloadPercent(points: number, expectedPoints: number) {
  if (expectedPoints > 0) {
    return Math.min(Math.max((points / expectedPoints) * 100, 0), 100);
  }
  return points > 0 ? 100 : 0;
}

// ---------------------------------------------------------------------------
// Recommendation helpers
// ---------------------------------------------------------------------------

// "Do X. Because Y." -> headline "Do X." + reason "Because Y."
function splitDetail(detail: string) {
  const match = detail.match(/^(.*?[.!?])\s+(.*)$/s);
  return match
    ? { headline: match[1], reason: match[2] }
    : { headline: detail, reason: null };
}

function parseDay(iso: string) {
  return new Date(`${iso}T00:00:00`);
}

function formatDay(iso: string) {
  return parseDay(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function isPastDay(iso: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parseDay(iso) < today;
}

function formatGeneratedAt(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Recommendation Card
// ---------------------------------------------------------------------------

function RecommendationCard({ item, onApplied }: { item: RecommendationResponse; onApplied: () => void }) {
  const navigate = useNavigate();
  const { headline, reason } = splitDetail(item.detail);
  const link = buildTaskLink(item);
  const [splitOpen, setSplitOpen] = useState(false);
  const isSplit = item.suggestion_type === "split";

  const isReschedule = item.suggestion_type === "reschedule";
  const overdue = !!item.current_deadline && isPastDay(item.current_deadline);
  const showDeadlineMove =
    isReschedule && !!item.current_deadline && !!item.suggested_deadline;
  const suggestedAlreadyPast =
    !!item.suggested_deadline && isPastDay(item.suggested_deadline);

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      {/* Rank + type + overdue flag + Go */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
          #{item.rank}
        </span>

        <span
          className={`rounded border px-2 py-0.5 text-xs font-medium ${suggestionStyles[item.suggestion_type]}`}
        >
          {suggestionLabels[item.suggestion_type]}
        </span>

        {overdue && (
          <span className="rounded border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
            Task overdue
          </span>
        )}

        <span
          className="ml-auto"
          title={link ? undefined : "This task no longer exists"}
        >
          <Button
            variant="outline"
            size="sm"
            disabled={!isSplit && !link}
            onClick={() =>
              isSplit ? setSplitOpen(true) : link && navigate(link)
            }
          >
            {isSplit ? "View split" : goLabels[item.suggestion_type]}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </span>
      </div>

      {/* Action + reason */}
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-card-foreground">{headline}</p>
        {reason && <p className="text-xs text-muted-foreground">{reason}</p>}

        {item.to_member_name && (
          <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {item.from_member_name}
            <ArrowRight className="h-3 w-3" />
            {item.to_member_name}
          </p>
        )}
      </div>

      {/* Outcome rows */}
      <div className="grid grid-cols-1 gap-2 rounded-md bg-muted/50 p-3 text-xs sm:grid-cols-2">
        <div>
          <p className="font-medium uppercase tracking-wide text-muted-foreground">
            Workload after
          </p>
          <p className="mt-0.5 text-card-foreground">
            {item.expected_workload_after}
          </p>
        </div>

        <div>
          <p className="font-medium uppercase tracking-wide text-muted-foreground">
            Deadline impact
          </p>

          {showDeadlineMove ? (
            <>
              <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-card-foreground">
                <span className={overdue ? "text-red-500 line-through" : ""}>
                  {formatDay(item.current_deadline!)}
                </span>
                <ArrowRight className="h-3 w-3" />
                <span className="font-semibold">
                  {formatDay(item.suggested_deadline!)}
                </span>
                {item.extension_days != null && (
                  <span className="text-muted-foreground">
                    (+{item.extension_days}d)
                  </span>
                )}
              </p>

              {suggestedAlreadyPast && (
                <p className="mt-1 text-amber-600 dark:text-amber-400">
                  This date has already passed. Pick a later one.
                </p>
              )}
            </>
          ) : (
            <p className="mt-0.5 text-card-foreground">
              {item.deadline_impact}
            </p>
          )}
        </div>
      </div>
      {isSplit && (
        <SplitTaskDialog
          open={splitOpen}
          onOpenChange={setSplitOpen}
          item={item}
          projectId={item.project_id}
          onApplied={onApplied}
        />
      )}
    </div>
  );
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
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-64" />
            <Skeleton className="h-3 w-48" />
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="flex flex-col gap-3 rounded-lg border p-4"
            >
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-7 rounded" />
                <Skeleton className="h-5 w-24 rounded" />
              </div>

              <div className="flex flex-col gap-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-4/5" />
              </div>

              <div className="grid grid-cols-1 gap-2 rounded-md p-3 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-40" />
                </div>
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
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
    refetch: refetchProject,
  } = useGetCurrentProject(user?.id ?? "");

  const projectId = project?.id ?? "";

  const {
    data: members = [],
    isLoading: isMembersLoading,
    isError: isMembersError,
    error: membersErrorObj,
    refetch: refetchMembers,
  } = useGetMembersWithUserSnapshot(projectId);

  const {
    data: tasks = [],
    isLoading: isTasksLoading,
    isError: isTasksError,
    error: tasksErrorObj,
    refetch: refetchTasks,
  } = useGetAllTaskAssignedMembers(projectId);

  const {
    data: recommendations = [],
    isLoading: isRecommendationsLoading,
    isError: isRecommendationsError,
    error: recommendationsErrorObj,
    refetch: refetchRecommendations,
  } = useGetProjectRecommendations(projectId);

  // Ignore anything cached from a different project, and keep rank order.
  const projectRecommendations = recommendations
    .filter((item) => item.project_id === projectId)
    .sort((a, b) => a.rank - b.rank);

  // ISO timestamps compare correctly as strings.
  const lastGeneratedAt = projectRecommendations.reduce<string | null>(
    (latest, item) =>
      !latest || item.created_at > latest ? item.created_at : latest,
    null,
  );

  const snapshot = project?.snapshot;

  const recalculateWorkload = useRecalculateWorkloadBalance();
  const { refetch: refetchBreakdown } = useWorkloadBalanceBreakdown(projectId);

  // Covers both the recalculation and the refetch that follows it.
  const [isSyncing, setIsSyncing] = useState(false);
  const isRefreshing = recalculateWorkload.isPending || isSyncing;

  const handleRefresh = async () => {
    if (!projectId) return;

    setIsSyncing(true);

    try {
      await recalculateWorkload.mutateAsync({ projectId });

      // Pull fresh data everywhere the recalculation can change it:
      // project snapshot, per-member snapshots, tasks, recommendations,
      // and the balance breakdown.
      await Promise.all([
        refetchProject(),
        refetchMembers(),
        refetchTasks(),
        refetchRecommendations(),
        refetchBreakdown(),
      ]);

      toast.success("Workload recalculated.");
    } catch {
      toast.error("Couldn't recalculate the workload. Please try again.");
    } finally {
      setIsSyncing(false);
    }
  };

  const generateRecommendations = useGenerateRecommendations();

  const handleGenerate = () => {
    if (!projectId) return;

    generateRecommendations.mutate(projectId, {
      onSuccess: (result) => {
        if (result.length === 0) {
          toast.info(
            "No recommendations needed. Nobody is overloaded, or no option is viable.",
          );
        } else if (result.every((r) => r.suggestion_type === "reschedule")) {
          toast.success(
            `Generated ${result.length} suggestion(s), all deadline extensions. No members could take extra work.`,
          );
        } else {
          toast.success(`Generated ${result.length} recommendation(s).`);
        }
      },
      onError: () => {
        toast.error("Couldn't generate recommendations. Please try again.");
      },
    });
  };

  const handleApplied = async () => {
    await handleRefresh();
    handleGenerate();
  };

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

      const expectedPoints = latestSnapshot
        ? Number(latestSnapshot.expected_points)
        : 0;

      return {
        name: memberName(member),
        pts: points,
        expectedPoints,
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
    complexityCounts.high + complexityCounts.medium + complexityCounts.low;

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

  const showSplitTaskTip =
    complexityCounts.high >= HIGH_COMPLEXITY_TIP_MIN_TASKS &&
    totalComplexityTasks > 0 &&
    complexityCounts.high / totalComplexityTasks >= HIGH_COMPLEXITY_TIP_RATIO;

  const overloadedCount = memberWorkload.filter(
    (member) => member.status === "overloaded",
  ).length;

  const underutilizedCount = memberWorkload.filter(
    (member) => member.status === "underutilized",
  ).length;

  const severity = snapshot?.imbalance_severity ?? "low";
  const bannerTone = getBannerTone(severity, !!snapshot);

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
          {/* ── Page Heading + Recalculate ─────────────────────────── */}
          <div className="flex items-center justify-between gap-4 lg:col-span-2">
            <h1 className="my-2 text-2xl font-bold text-(--text-h) dark:text-card-foreground">
              Track and optimize task distribution across team members
            </h1>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing || !projectId}
              className="shrink-0"
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              {isRefreshing ? "Recalculating..." : "Recalculate"}
            </Button>
          </div>

          {/* ── Workload Health Banner ─────────────────────────────── */}
          <Card
            className={`flex items-start justify-between rounded-lg border-4 bg-card p-4 lg:col-span-2 ${bannerTone.border}`}
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <TriangleAlert className={`h-5 w-5 ${bannerTone.icon}`} />

                <h2 className={`font-semibold ${bannerTone.title}`}>
                  {bannerTone.heading}
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
                  {snapshot?.workload_balance != null
                    ? `${Number(snapshot.workload_balance).toFixed(0)}% balance`
                    : "Balance N/A"}
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
              ["OVERLOADED", overloadedCount.toString(), "MEMBERS OVER LIMIT"],
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

                  <p className="text-xs text-card-foreground">{description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ── Workload Balance Breakdown ─────────────────────────── */}
          {/* TODO: implement a proper breakdown later for the balance */}

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
                  const pct = workloadPercent(
                    member.pts,
                    member.expectedPoints,
                  );

                  const style = workloadStyles[member.status as MemberStatus];

                  return (
                    <div key={member.name} className="flex flex-col gap-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-card-foreground">
                          {member.name}
                        </span>

                        <span className={`text-xs font-semibold ${style.text}`}>
                          {member.pts.toFixed(1)} pts /{" "}
                          {member.expectedPoints.toFixed(1)}
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
                    formatter={(value) => [`${Number(value).toFixed(0)}%`]}
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

              {showSplitTaskTip && (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-yellow-500/50 bg-yellow-50 p-3 dark:bg-yellow-500/10">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600 dark:text-yellow-500" />
                  <p className="text-sm text-yellow-900 dark:text-yellow-500">
                    <span className="font-semibold">Tip:</span> Consider
                    splitting complex or heavy tasks into smaller ones so the
                    workload is easier to spread across members.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Redistribution Recommendations ────────────────────── */}
          <Card className="rounded-xl border shadow-sm lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <CardTitle className="text-base font-semibold">
                  Redistribution Recommendations
                </CardTitle>

                {lastGeneratedAt && (
                  <p className="text-xs text-muted-foreground">
                    {projectRecommendations.length} suggestion
                    {projectRecommendations.length === 1 ? "" : "s"} · Generated{" "}
                    {formatGeneratedAt(lastGeneratedAt)}
                  </p>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerate}
                disabled={
                  generateRecommendations.isPending ||
                  isRefreshing ||
                  !projectId
                }
                className="shrink-0"
              >
                <Sparkles
                  className={`mr-2 h-4 w-4 ${
                    generateRecommendations.isPending ? "animate-pulse" : ""
                  }`}
                />
                {generateRecommendations.isPending
                  ? "Generating..."
                  : "Generate"}
              </Button>
            </CardHeader>

            <CardContent className="flex flex-col gap-3">
              {projectRecommendations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No recommendations yet. Click Generate to check for ways to
                  rebalance the workload.
                </p>
              ) : (
                projectRecommendations.map((item) => (
                  <RecommendationCard key={item.id} item={item} onApplied={handleApplied}/>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </AppLayout>
  );
}
