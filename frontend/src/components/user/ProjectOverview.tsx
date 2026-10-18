import { Activity, BarChart3, FolderKanban, Gauge, TriangleAlert } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { useGetMembersWithUserSnapshot } from "@/hooks/useProjectMember";

import type { MemberStatus } from "@/types/member_snapshot";
import type { HealthStatus, ProjectHealth } from "@/types/projectHealth";
import type { TaskResponseMembers } from "@/types/task";

/* ------------------------------------------------------------------ */
/* Config (kept in sync with Dashboard / Workload)                     */
/* ------------------------------------------------------------------ */

const GOOD_MIN = 80;
const WARNING_MIN = 60;
const NON_MEMBER_ROLES = ["instructor", "advisor"];

type HealthLevel = "good" | "warning" | "bad";

const statusToLevel: Record<HealthStatus, HealthLevel> = {
  healthy: "good",
  watch: "warning",
  at_risk: "bad",
};

export const healthStatusLabel: Record<HealthStatus, string> = {
  healthy: "Healthy",
  watch: "Watch",
  at_risk: "At Risk",
};

const statusRank: Record<HealthStatus, number> = {
  healthy: 0,
  watch: 1,
  at_risk: 2,
};

/** Pill classes for the health status (used in the page header too). */
export function healthBadgeClasses(status?: HealthStatus) {
  switch (status) {
    case "healthy":
      return "bg-emerald-100 text-emerald-700 dark:text-emerald-100";
    case "watch":
      return "bg-amber-100 text-amber-700 dark:text-amber-100";
    case "at_risk":
      return "bg-rose-100 text-rose-700 dark:text-rose-100";
    default:
      return "bg-neutral-100 text-neutral-700 dark:text-neutral-100";
  }
}

function scoreToLevel(score: number | null): HealthLevel | null {
  if (score === null) return null;
  if (score >= GOOD_MIN) return "good";
  if (score >= WARNING_MIN) return "warning";
  return "bad";
}

const levelStyles: Record<
  HealthLevel,
  { border: string; icon: string; title: string; bar: string; text: string; heading: string; message: string }
> = {
  good: {
    border: "border-green-500",
    icon: "text-green-500",
    title: "text-green-700 dark:text-green-500",
    bar: "bg-green-500",
    text: "text-green-600",
    heading: "Project Health On Track",
    message: "The project is on track.",
  },
  warning: {
    border: "border-yellow-500",
    icon: "text-yellow-500",
    title: "text-yellow-700 dark:text-yellow-500",
    bar: "bg-yellow-400",
    text: "text-yellow-600",
    heading: "Project Health: Watch",
    message: "Some health indicators need a closer look.",
  },
  bad: {
    border: "border-red-500",
    icon: "text-red-500",
    title: "text-red-700 dark:text-red-500",
    bar: "bg-red-500",
    text: "text-red-600",
    heading: "Project Health: At Risk",
    message: "The project is at risk.",
  },
};

const workloadStyles: Record<MemberStatus, { bar: string; text: string }> = {
  overloaded: { bar: "bg-red-500", text: "text-red-500" },
  underutilized: { bar: "bg-yellow-400", text: "text-yellow-600" },
  normal: { bar: "bg-green-500", text: "text-green-600" },
};

/* ------------------------------------------------------------------ */
/* Formatting helpers                                                  */
/* ------------------------------------------------------------------ */

const toPct = (ratio: number) => Math.round(ratio * 100);

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

const formatPoints = (n: number) =>
  Number.isInteger(n) ? String(n) : n.toFixed(1);

const capitalize = (value: string) =>
  value ? `${value[0].toUpperCase()}${value.slice(1)}` : value;

function workloadPercent(points: number, expectedPoints: number) {
  if (expectedPoints > 0) {
    return Math.min(Math.max((points / expectedPoints) * 100, 0), 100);
  }
  return points > 0 ? 100 : 0;
}

/** Explains why the status is worse than the score alone would give. */
function getOverrideExplanation(health: ProjectHealth): string | null {
  if (statusRank[health.status] <= statusRank[health.base_status]) return null;

  const reasons: string[] = [];

  if (health.overrides_applied.includes("overdue_rate")) {
    reasons.push(`${toPct(health.schedule.overdue_rate)}% of open tasks are overdue`);
  }
  if (health.overrides_applied.includes("chronic_escalation")) {
    reasons.push(
      `${plural(health.risk.chronic_count, "member is", "members are")} chronically overloaded`,
    );
  }

  const scoreText =
    health.score === null
      ? ""
      : ` (score alone: ${Math.round(health.score)}, ${healthStatusLabel[health.base_status]})`;

  if (reasons.length === 0) {
    return `${healthStatusLabel[health.status]} due to an override rule${scoreText}`;
  }

  return `${healthStatusLabel[health.status]} because ${reasons.join(" and ")}${scoreText}`;
}

/** The (up to) two weakest sub-scores, as plain-text findings. No links: this view is read-only. */
function getAttentionItems(health: ProjectHealth) {
  const { schedule, balance, risk, activity } = health;

  const scheduleMessage =
    schedule.overdue_tasks > 0
      ? `${plural(schedule.overdue_tasks, "task", "tasks")} overdue`
      : schedule.spi !== null && schedule.spi < 1
        ? `Behind schedule (SPI ${schedule.spi.toFixed(2)})`
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

  const activityMessage = `${plural(activity.stale_in_progress, "task", "tasks")} stalled in progress`;

  const candidates: Array<{ key: string; score: number | null; message: string }> = [
    { key: "schedule", score: health.schedule_score, message: scheduleMessage },
    { key: "workload", score: health.workload_balance_score, message: workloadMessage },
    { key: "risk", score: health.risk_score, message: riskMessage },
    { key: "activity", score: health.activity_score, message: activityMessage },
  ];

  return candidates
    .filter((c): c is { key: string; score: number; message: string } => c.score !== null && c.score < GOOD_MIN)
    .sort((a, b) => a.score - b.score)
    .slice(0, 2);
}

/* ------------------------------------------------------------------ */
/* Small presentational pieces                                         */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  caption,
  icon,
  valueClassName = "text-foreground",
}: {
  label: string;
  value: string;
  caption: string;
  icon: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon}
        {label}
      </div>
      <p className={`mt-3 text-2xl font-bold capitalize ${valueClassName}`}>{value}</p>
      <p className="mt-1 text-sm text-neutral-500">{caption}</p>
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <Skeleton className="h-5 w-28" />
      <Skeleton className="mt-4 h-8 w-24" />
      <Skeleton className="mt-2 h-4 w-32" />
    </div>
  );
}

function SubScoreTile({
  title,
  score,
  detail,
}: {
  title: string;
  score: number | null;
  detail: string;
}) {
  const level = scoreToLevel(score);
  const style = level ? levelStyles[level] : null;
  const width = score === null ? 0 : Math.max(0, Math.min(100, score));

  return (
    <Card className="gap-2 rounded-lg p-4 shadow-sm">
      <p className="text-sm font-medium text-gray-500 dark:text-(--semi-foreground)">{title}</p>

      <p className={`text-2xl font-bold ${style ? style.text : "text-gray-400"}`}>
        {score === null ? "None" : Math.round(score)}
      </p>

      <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${style ? style.bar : "bg-gray-300"}`}
          style={{ width: `${width}%` }}
        />
      </div>

      <p className="text-xs text-gray-500 dark:text-(--semi-foreground)">{detail}</p>
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2 text-foreground dark:bg-(--semi-card)">
      <span>{label}</span>
      <span className="font-semibold text-(--semi-foreground)">{value}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

type ProjectOverviewProps = {
  health?: ProjectHealth;
  isHealthLoading: boolean;
  isHealthError: boolean;

  /** Workload balance values from the project snapshot (same source as the Workload page). */
  workloadBalance?: number | null;
  imbalanceSeverity?: string | null;
  totalWorkloadPoints?: number | null;

  tasks: TaskResponseMembers[];
  isTasksLoading: boolean;

  projectId: string;
  leaderName: string;
  instructorName: string;
  advisorName: string;
};

export default function ProjectOverview({
  health,
  isHealthLoading,
  isHealthError,
  workloadBalance,
  imbalanceSeverity,
  totalWorkloadPoints,
  tasks,
  isTasksLoading,
  projectId,
  leaderName,
  instructorName,
  advisorName,
}: ProjectOverviewProps) {
  const { data: members = [], isLoading: isMembersLoading } =
    useGetMembersWithUserSnapshot(projectId);

  /* ---- Stat cards ---- */
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const submittedCount = tasks.filter((t) => t.status === "submitted").length;

  const completion = health?.schedule.completion_pct ?? null;
  const spi = health?.schedule.spi ?? null;
  const level = health ? statusToLevel[health.status] : null;
  const healthStyle = level ? levelStyles[level] : null;

  const hasBalance = typeof workloadBalance === "number" && !Number.isNaN(workloadBalance);

  /* ---- Member workload (read-only) ---- */
  const memberWorkload = members
    .filter((m) => !NON_MEMBER_ROLES.includes(m.project_role?.toLowerCase() ?? ""))
    .map((m) => {
      const latest = m.snapshots[0];
      return {
        id: m.id,
        name: `${m.user.first_name} ${m.user.last_name}`.trim(),
        pts: latest ? Number(latest.total_effective_points) : 0,
        expectedPoints: latest ? Number(latest.expected_points) : 0,
        status: (latest?.workload_status ?? "normal") as MemberStatus,
      };
    })
    .sort((a, b) => b.pts - a.pts);

  const attentionItems = health ? getAttentionItems(health) : [];
  const hasAnyScore = health
    ? [health.schedule_score, health.workload_balance_score, health.risk_score, health.activity_score].some(
        (s) => s !== null,
      )
    : false;

  return (
    <div className="mt-6 space-y-6">
      {/* ── Summary cards ───────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {isHealthLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              label="Progress"
              value={completion === null ? "None" : `${Math.round(completion)}%`}
              caption={
                spi === null
                  ? "No points due yet"
                  : `SPI ${spi.toFixed(2)} · ${formatPoints(health!.schedule.completed_points)} of ${formatPoints(
                      health!.schedule.total_points,
                    )} pts`
              }
              icon={<Gauge className="h-4 w-4 text-[#7A0C2E]" />}
            />

            <StatCard
              label="Health"
              value={health ? healthStatusLabel[health.status] : "Unavailable"}
              caption={
                health
                  ? `Score ${health.score === null ? "None" : Math.round(health.score)} / 100`
                  : "Couldn't load project health"
              }
              icon={<Activity className="h-4 w-4 text-[#C9A84C]" />}
              valueClassName={healthStyle ? healthStyle.text : "text-foreground"}
            />
          </>
        )}

        {isTasksLoading ? (
          <StatCardSkeleton />
        ) : (
          <StatCard
            label="Completed tasks"
            value={String(completedCount)}
            caption={`of ${tasks.length} tasks${submittedCount > 0 ? ` · ${submittedCount} submitted` : ""}`}
            icon={<FolderKanban className="h-4 w-4 text-[#3F3350]" />}
          />
        )}

        <StatCard
          label="Workload balance"
          value={hasBalance ? `${Number(workloadBalance).toFixed(0)}%` : "None"}
          caption={imbalanceSeverity ? `${capitalize(imbalanceSeverity)} imbalance` : "No severity data"}
          icon={<BarChart3 className="h-4 w-4 text-[#7A0C2E]" />}
        />
      </div>

      {/* ── Health summary banner ───────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {isHealthLoading ? (
          <Card className="rounded-lg border-4 p-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="mt-3 h-4 w-full max-w-lg" />
          </Card>
        ) : isHealthError || !health ? (
          <Card className="rounded-lg border-4 border-gray-300 p-4 dark:border-gray-600">
            <h2 className="font-semibold text-foreground">Health unavailable</h2>
            <p className="text-sm text-gray-500 dark:text-card-foreground">
              We couldn&apos;t load the project health right now.
            </p>
          </Card>
        ) : (
          <Card className={`rounded-lg border-4 p-4 ${levelStyles[statusToLevel[health.status]].border}`}>
            <div className="flex items-center gap-2">
              {statusToLevel[health.status] !== "good" && (
                <TriangleAlert className={`h-5 w-5 ${levelStyles[statusToLevel[health.status]].icon}`} />
              )}
              <h2 className={`font-semibold ${levelStyles[statusToLevel[health.status]].title}`}>
                {levelStyles[statusToLevel[health.status]].heading}
              </h2>
            </div>
            <p className="mt-2 text-sm text-gray-500 dark:text-card-foreground">
              {getOverrideExplanation(health) ?? levelStyles[statusToLevel[health.status]].message}
            </p>
            {attentionItems.length > 0 ? (
              <ul className="mt-3 space-y-1">
                {attentionItems.map((item) => (
                  <li key={item.key} className="flex items-center gap-3 px-1 py-1 text-sm">
                    <span className={`h-3 w-3 rounded-full ${levelStyles[scoreToLevel(item.score) ?? "bad"].bar}`} />
                    <span className="text-gray-700 dark:text-card-foreground">{item.message}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-gray-500 dark:text-(--semi-foreground)">
                {hasAnyScore ? "Nothing needs attention right now." : "Not enough data yet to highlight anything."}
              </p>
            )}
          </Card>
        )}
                <Card className="border p-4">
            <h2 className="text-lg font-semibold text-foreground">Project contacts</h2>
            <div className="mt-4 space-y-3 text-sm text-neutral-600">
              <DetailRow label="Project leader" value={leaderName} />
              <DetailRow label="Instructor" value={instructorName} />
              <DetailRow label="Advisor" value={advisorName} />
            </div>
          </Card>
      </div>

      {/* ── Sub-score tiles ─────────────────────────────────────── */}
      {isHealthLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="rounded-lg p-4 shadow-sm">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-2 w-full rounded-full" />
              <Skeleton className="h-3 w-40" />
            </Card>
          ))}
        </div>
      ) : health ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SubScoreTile
            title="Schedule"
            score={health.schedule_score}
            detail={
              health.schedule.applicable
                ? `${toPct(health.schedule.overdue_rate)}% overdue · SPI ${
                    health.schedule.spi === null ? "None" : health.schedule.spi.toFixed(2)
                  }`
                : "No live tasks"
            }
          />
          <SubScoreTile
            title="Workload balance"
            score={health.workload_balance_score}
            detail={
              health.balance.applicable
                ? `${health.balance.overloaded_count} overloaded · max load ${toPct(health.balance.max_load_ratio)}%`
                : "No open workload"
            }
          />
          <SubScoreTile
            title="Risk"
            score={health.risk_score}
            detail={`${health.risk.chronic_count} chronic · ${health.risk.unassigned_count} unassigned`}
          />
          <SubScoreTile
            title="Activity"
            score={health.activity_score}
            detail={
              health.activity.applicable ? `${health.activity.stale_in_progress} stalled` : "Nothing in progress"
            }
          />
        </div>
      ) : null}

      {/* ── Details + Member workload + Contacts ────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border p-4">
          <h2 className="text-lg font-semibold text-foreground">Details</h2>

          <div className="mt-4 space-y-3 text-sm text-neutral-600">
            {isHealthLoading ? (
              [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-9 w-full rounded-lg" />)
            ) : health ? (
              <>
                <DetailRow
                  label="Points completed"
                  value={`${formatPoints(health.schedule.completed_points)} / ${formatPoints(
                    health.schedule.total_points,
                  )}`}
                />
                <DetailRow
                  label="Earned vs. planned"
                  value={`${formatPoints(health.schedule.earned_points)} / ${formatPoints(
                    health.schedule.planned_points,
                  )}`}
                />
                <DetailRow label="Open tasks" value={String(health.schedule.open_tasks)} />
                <DetailRow label="Overdue tasks" value={String(health.schedule.overdue_tasks)} />
                <DetailRow label="Due within 7 days" value={String(health.schedule.at_risk_tasks)} />
                <DetailRow
                  label="Total workload points"
                  value={typeof totalWorkloadPoints === "number" ? formatPoints(totalWorkloadPoints) : "None"}
                />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Details unavailable.</p>
            )}
          </div>
        </Card>

        <Card className="border p-4">
          <h2 className="text-lg font-semibold text-foreground">Member workload</h2>
          <p className="text-sm text-gray-500 dark:text-(--semi-foreground)">Current points vs. expected</p>

          <div className="mt-4 flex flex-col gap-4">
            {isMembersLoading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              ))
            ) : memberWorkload.length === 0 ? (
              <p className="text-sm text-muted-foreground">No member snapshot data available.</p>
            ) : (
              memberWorkload.map((member) => {
                const style = workloadStyles[member.status] ?? workloadStyles.normal;

                return (
                  <div key={member.id} className="flex flex-col gap-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-card-foreground">{member.name}</span>
                      <span className={`text-xs font-semibold ${style.text}`}>
                        {member.pts.toFixed(1)} pts / {member.expectedPoints.toFixed(1)}
                      </span>
                    </div>

                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full ${style.bar}`}
                        style={{ width: `${workloadPercent(member.pts, member.expectedPoints)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}