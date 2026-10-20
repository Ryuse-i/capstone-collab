import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/layouts/Applayout";
import {
  AlertTriangle,
  Activity,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  FileText,
  Layers,
  MessageSquare,
  Plus,
  RefreshCw,
  RotateCcw,
  Send,
  User,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useGetInstructorDashboard } from "@/hooks/useInstructorDashboard";
import type {
  DashboardDeadline,
  DashboardHealth,
  DashboardProject,
  DashboardRole,
  DashboardUrgency,
} from "@/types/instructorDashboard";

// ---------------------------------------------------------------------------
// Constants / helpers
// ---------------------------------------------------------------------------

// Backend levels (healthy / watch / at_risk) used directly; only labels and colors here.
const HEALTH: Record<
  DashboardHealth | "unknown",
  { label: string; rank: number; className: string }
> = {
  healthy: {
    label: "On track",
    rank: 0,
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-1 dark:ring-inset dark:ring-emerald-800/70",
  },
  watch: {
    label: "Watch",
    rank: 1,
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-1 dark:ring-inset dark:ring-amber-800/70",
  },
  at_risk: {
    label: "At risk",
    rank: 2,
    className:
      "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 dark:ring-1 dark:ring-inset dark:ring-rose-800/70",
  },
  unknown: {
    label: "No health data",
    rank: 0,
    className:
      "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 dark:ring-1 dark:ring-inset dark:ring-neutral-700",
  },
};

const URGENCY_STYLES: Record<
  DashboardUrgency,
  { dateClass: string; label: (d: number) => string }
> = {
  overdue: {
    dateClass:
      "bg-rose-100 text-rose-700 dark:bg-transparent dark:text-rose-300 dark:ring-1 dark:ring-inset dark:ring-rose-800/70",
    label: (d) => `${Math.abs(d)}d overdue`,
  },
  today: {
    dateClass:
      "bg-rose-100 text-rose-700 dark:bg-transparent dark:text-rose-300 dark:ring-1 dark:ring-inset dark:ring-rose-800/70",
    label: () => "Due today",
  },
  soon: {
    dateClass:
      "bg-amber-100 text-amber-700 dark:bg-transparent dark:text-amber-300 dark:ring-1 dark:ring-inset dark:ring-amber-800/70",
    label: (d) => `In ${d}d`,
  },
  later: {
    dateClass:
      "bg-neutral-100 text-neutral-600 dark:bg-transparent dark:text-neutral-300 dark:ring-1 dark:ring-inset dark:ring-neutral-700",
    label: (d) => `In ${d}d`,
  },
};

// Icon per activity type. Old rows have type = null and fall back to FileText.
const ACTIVITY_ICONS: Record<string, LucideIcon> = {
  task_created: Plus,
  task_submitted: Send,
  task_status_changed: RefreshCw,
  comment_added: MessageSquare,
  member_joined: UserPlus,
  revision_requested: RotateCcw,
  submission_accepted: CheckCircle2,
};

// "YYYY-MM-DD" -> "Oct 19", read as a calendar date (no timezone shift).
function formatDeadlineDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatTimeAgo(iso: string): string {
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 1000),
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function healthOf(p: DashboardProject) {
  return HEALTH[p.health ?? "unknown"];
}

const ATTENTION_VISIBLE_LIMIT = 4;
const DEADLINE_VISIBLE_LIMIT = 3;

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function InstructorDashboardSkeleton() {
  return (
    <div className="min-h-screen w-full py-0 font-sans antialiased">
      <div className="mb-5">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="mt-3 h-4 w-96 max-w-full" />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <Card key={item} className="border p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-7 rounded-full" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="mt-3 h-8 w-12" />
            <Skeleton className="mt-2 h-4 w-32" />
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2 lg:items-stretch">
        <Card className="flex h-full flex-col border shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-5 w-40" />
            </div>
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="flex-1 divide-y">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                  <Skeleton className="mt-2 h-5 w-3/4" />
                  <Skeleton className="mt-2 h-4 w-56" />
                </div>
                <div className="flex items-center gap-2 sm:shrink-0">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-9 w-20 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="flex h-full flex-col border shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-5 w-44" />
            </div>
            <div className="flex gap-1.5">
              <Skeleton className="h-7 w-12 rounded-full" />
              <Skeleton className="h-7 w-24 rounded-full" />
              <Skeleton className="h-7 w-24 rounded-full" />
            </div>
          </div>
          <div className="flex-1 px-5 py-4">
            {[1, 2, 3].map((item) => (
              <div key={item} className="flex gap-4 pb-6">
                <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-6 w-32 rounded-full" />
                  <Skeleton className="mt-2 h-5 w-3/4" />
                  <Skeleton className="mt-2 h-4 w-2/3" />
                  <Skeleton className="mt-2 h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <Card className="border p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-5 w-36" />
          </div>
          <div className="mt-4 space-y-4">
            {[1, 2, 3].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <Skeleton className="mt-1 h-8 w-8 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="mt-2 h-3 w-2/5" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Presentational components
// ---------------------------------------------------------------------------

function HealthBadge({ project }: { project: DashboardProject }) {
  const info = healthOf(project);
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${info.className}`}
    >
      {info.label}
    </span>
  );
}

function RoleBadge({ role }: { role: DashboardRole }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.06em] ${
        role === "instructor"
          ? "bg-[#F3EFE6] text-[#7A0C2E] dark:bg-[#7A0C2E] dark:text-[#F3EFE6]"
          : "bg-[#EFEAF6] text-[#3F3350]"
      }`}
    >
      {role}
    </span>
  );
}

function StatCard({
  icon,
  label,
  value,
  caption,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  caption: string;
  accent: string;
}) {
  return (
    <Card className="border p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <span className={`rounded-full p-1.5 ${accent}`}>{icon}</span>
        {label}
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums text-foreground">
        {value}
      </p>
      <p className="mt-1 text-sm text-neutral-500">{caption}</p>
    </Card>
  );
}

function ProgressLine({ project }: { project: DashboardProject }) {
  return (
    <p className="mt-0.5 text-sm text-neutral-500">
      {project.progress}% complete
    </p>
  );
}

function PendingBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600">
      {count} awaiting feedback
    </span>
  );
}

function AttentionDetailRow({ project }: { project: DashboardProject }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <RoleBadge role={project.role} />
        <HealthBadge project={project} />
      </div>

      <h3 className="mt-2 text-base font-semibold text-foreground">
        {project.name}
      </h3>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-neutral-600">
        <span>{project.progress}% complete</span>
        <PendingBadge count={project.pending_submissions} />
      </div>
    </div>
  );
}

function DeadlineDetailRow({ deadline }: { deadline: DashboardDeadline }) {
  const style = URGENCY_STYLES[deadline.urgency];

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <RoleBadge role={deadline.role} />
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${style.dateClass}`}
        >
          {style.label(deadline.days_from_now)} ·{" "}
          {formatDeadlineDate(deadline.deadline)}
        </span>
      </div>

      <h3 className="mt-2 text-base font-semibold text-foreground">
        {deadline.title}
      </h3>

      <p className="mt-1 text-sm font-medium text-neutral-600">
        {deadline.project_name}
      </p>

      <div className="mt-2 flex items-center gap-1.5 text-sm text-neutral-500">
        <User size={13} />
        {deadline.student_names.length > 0
          ? deadline.student_names.join(", ")
          : "Unassigned"}
      </div>

      {deadline.note && (
        <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-neutral-500">
          {deadline.note}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function InstructorDashboard() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<DashboardRole | "all">("all");
  const [attentionDialogOpen, setAttentionDialogOpen] = useState(false);
  const [deadlineDialogOpen, setDeadlineDialogOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useGetInstructorDashboard();

  const projects = useMemo(() => data?.projects ?? [], [data]);
  const deadlines = useMemo(() => data?.deadlines ?? [], [data]);
  const activity = useMemo(
    () =>
      [...(data?.recent_activity ?? [])].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      ),
    [data],
  );

  const filteredDeadlines = useMemo(
    () =>
      deadlines
        .filter((d) => filter === "all" || d.role === filter)
        .sort((a, b) => a.days_from_now - b.days_from_now),
    [deadlines, filter],
  );
  const visibleDeadlines = filteredDeadlines.slice(0, DEADLINE_VISIBLE_LIMIT);
  const hasMoreDeadlines = filteredDeadlines.length > DEADLINE_VISIBLE_LIMIT;
  const hasActivity = activity.length > 0;

  // All of the user's projects: worst health first, then most awaiting feedback.
  const needsAttentionAll = useMemo(
    () =>
      [...projects].sort((a, b) => {
        const healthDiff = healthOf(b).rank - healthOf(a).rank;
        if (healthDiff !== 0) return healthDiff;
        return b.pending_submissions - a.pending_submissions;
      }),
    [projects],
  );
  const needsAttention = needsAttentionAll.slice(0, ATTENTION_VISIBLE_LIMIT);
  const hasMoreAttention = needsAttentionAll.length > ATTENTION_VISIBLE_LIMIT;

  const stats = data?.stats;

  const openProject = (id: string) => navigate(`/view-project/${id}`);

  return (
    <AppLayout breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }]}>
      {isLoading ? (
        <InstructorDashboardSkeleton />
      ) : isError || !data ? (
        <div className="flex min-h-80 flex-col items-center justify-center gap-4">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <p className="text-foreground dark:text-muted-foreground">
            Failed to load your dashboard. Please try again.
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <div className="min-h-screen w-full py-0 font-sans antialiased">
          <div className="mb-5">
            <h1 className="my-2 text-2xl font-bold text-foreground">
              Your projects
            </h1>
            <p className="mt-2 text-sm text-neutral-500 dark:text-semiforeground">
              A portfolio view across everything you're instructing or advising.
            </p>
          </div>

          {/* Summary strip */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              icon={
                <Layers
                  size={16}
                  className="text-[#7A0C2E] dark:text-[#ac1343]"
                />
              }
              label="Active projects"
              value={stats?.total_projects ?? 0}
              caption="Across both roles"
              accent="bg-[#F3EFE6] dark:bg-muted/50 dark:border dark:border-[#ac1343]"
            />
            <StatCard
              icon={<AlertTriangle size={16} className="text-rose-600" />}
              label="Watch or at risk"
              value={stats?.at_risk_projects ?? 0}
              caption="Need a closer look"
              accent="bg-rose-50 dark:bg-muted/50 dark:border dark:border-rose-600"
            />
            <StatCard
              icon={<ClipboardCheck size={16} className="text-[#C9A84C]" />}
              label="Pending submissions"
              value={stats?.pending_submissions ?? 0}
              caption="Awaiting your feedback"
              accent="bg-[#FBF3E7] dark:bg-muted/50 dark:border dark:border-[#C9A84C]"
            />
            <StatCard
              icon={
                <Clock
                  size={16}
                  className="text-[#3F3350] dark:text-[#514167] "
                />
              }
              label="Overdue deadlines"
              value={stats?.overdue_deadlines ?? 0}
              caption="Open tasks past due"
              accent="bg-[#EFEAF6] dark:bg-muted/50 dark:border dark:border-[#514167]"
            />
          </div>

          {/* Needs your attention + deadlines */}
          <div className="mt-6 grid gap-6 lg:grid-cols-2 lg:items-stretch">
            <Card className="flex h-full flex-col border shadow-sm">
              <div className="flex items-center justify-between border-b border-neutral px-5 py-4">
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-rose-50 p-2 text-rose-600 dark:bg-muted/50 dark:border dark:border-rose-600 mb-3">
                    <AlertTriangle size={16} />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Needs your attention
                  </h2>
                </div>
                <span className="text-sm text-neutral-500 dark:text-semiforeground">
                  Sorted by health, then pending items
                </span>
              </div>

              <div className="flex-1 divide-y">
                {needsAttention.map((p) => (
                  <div
                    key={`${p.role}-${p.id}`}
                    className="flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <RoleBadge role={p.role} />
                        <HealthBadge project={p} />
                      </div>
                      <h3 className="mt-1.5 text-base font-semibold leading-snug text-foreground">
                        {p.name}
                      </h3>
                      <ProgressLine project={p} />
                    </div>

                    <div className="flex items-center gap-2 sm:shrink-0">
                      <PendingBadge count={p.pending_submissions} />
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => openProject(p.id)}
                      >
                        Open
                        <ChevronRight size={14} />
                      </Button>
                    </div>
                  </div>
                ))}

                {needsAttention.length === 0 && (
                  <div className="px-5 py-8 text-center text-sm text-neutral-500">
                    You're not assigned to any project yet.
                  </div>
                )}
              </div>

              {hasMoreAttention && (
                <div className="border-t px-5 py-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-center gap-1.5 text-[#7A0C2E] hover:text-[#7A0C2E] dark:text-[#c82659] dark:hover:text-[#7A0C2E]"
                    onClick={() => setAttentionDialogOpen(true)}
                  >
                    View all {needsAttentionAll.length}
                    <ChevronRight size={14} />
                  </Button>
                </div>
              )}
            </Card>

            {/* Upcoming deadlines */}
            <Card className="flex h-full flex-col border shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-[#FBF3E7] p-2 text-[#C9A84C] dark:bg-muted/50 dark:border dark:border-[#C9A84C] mb-3">
                    <CalendarClock size={16} />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Upcoming deadlines
                  </h2>
                </div>

                <div className="flex gap-1.5">
                  {(
                    [
                      { id: "all", label: "All" },
                      { id: "instructor", label: "As instructor" },
                      { id: "advisor", label: "As advisor" },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setFilter(tab.id)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                        filter === tab.id
                          ? "bg-[#7A0C2E] text-white"
                          : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-muted/50 dark:text-neutral-300 dark:hover:bg-muted/70"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 px-5 py-4">
                {visibleDeadlines.map((d, i) => {
                  const style = URGENCY_STYLES[d.urgency];

                  return (
                    <div key={d.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl text-xs font-semibold tabular-nums ${style.dateClass}`}
                        >
                          {formatDeadlineDate(d.deadline)}
                        </div>
                        {i < visibleDeadlines.length - 1 && (
                          <div className="w-px flex-1 bg-neutral-200 dark:bg-muted/70" />
                        )}
                      </div>

                      <div className="flex min-w-0 flex-1 items-start justify-between gap-4 pb-6">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <RoleBadge role={d.role} />
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${style.dateClass}`}
                            >
                              {style.label(d.days_from_now)}
                            </span>
                          </div>

                          <h3 className="mt-1.5 text-base font-semibold leading-snug text-foreground">
                            {d.title}
                          </h3>

                          <p className="mt-0.5 text-sm font-medium text-neutral-600">
                            {d.project_name}
                          </p>

                          <div className="mt-2 flex items-center gap-1.5 text-sm text-neutral-500">
                            <User size={13} />
                            {d.student_names.length > 0
                              ? d.student_names.join(", ")
                              : "Unassigned"}
                          </div>

                          {d.note && (
                            <p className="mt-1.5 line-clamp-2 max-w-2xl text-sm leading-relaxed text-neutral-500">
                              {d.note}
                            </p>
                          )}
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 gap-1.5"
                          onClick={() => openProject(d.project_id)}
                        >
                          View project
                          <ChevronRight size={14} />
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {filteredDeadlines.length === 0 && (
                  <div className="py-8 text-center text-sm text-neutral-500">
                    No upcoming deadlines in this view.
                  </div>
                )}
              </div>

              {hasMoreDeadlines && (
                <div className="border-t px-5 py-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-center gap-1.5 text-[#7A0C2E] hover:text-[#7A0C2E] dark:text-[#c82659] dark:hover:text-[#7A0C2E]"
                    onClick={() => setDeadlineDialogOpen(true)}
                  >
                    View all {filteredDeadlines.length}
                    <ChevronRight size={14} />
                  </Button>
                </div>
              )}
            </Card>
          </div>

          {/* Recent activity (full width) */}
          {hasActivity && (
            <div className="mt-6">
              <Card className="border p-5 shadow-sm">
                <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <Activity size={18} className="text-[#C9A84C]" />
                  Recent activity
                </div>

                {activity.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-neutral-200 p-6 text-center text-sm text-neutral-500">
                    No recent activity in your projects yet.
                  </div>
                ) : (
                  <div className="mt-4 space-y-4">
                    {activity.map((a) => {
                      const Icon =
                        (a.type && ACTIVITY_ICONS[a.type]) || FileText;

                      return (
                        <div key={a.id} className="flex items-start gap-3">
                          <div className="mt-1 rounded-full bg-neutral-100 p-2 text-neutral-500">
                            <Icon size={14} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm text-foreground">
                              <span className="font-semibold">
                                {a.actor_name ?? "A member"}
                              </span>{" "}
                              {a.message}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-neutral-500">
                              {a.project_name} · {formatTimeAgo(a.timestamp)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Attention dialog */}
      <Dialog open={attentionDialogOpen} onOpenChange={setAttentionDialogOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl custom-scrollbar">
          <DialogHeader>
            <DialogTitle>Needs your attention</DialogTitle>
            <DialogDescription>
              All {needsAttentionAll.length} of your projects, sorted by health
              then pending items.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 space-y-3">
            {needsAttentionAll.map((p) => (
              <AttentionDetailRow key={`${p.role}-${p.id}`} project={p} />
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Deadline dialog */}
      <Dialog open={deadlineDialogOpen} onOpenChange={setDeadlineDialogOpen}>
        <DialogContent className="flex max-h-[80vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="shrink-0 border-b bg-background px-6 py-4">
            <DialogTitle>Upcoming deadlines</DialogTitle>
            <DialogDescription>
              All {filteredDeadlines.length} deadlines
              {filter !== "all" ? ` as ${filter}` : ""}, soonest first.
            </DialogDescription>
          </DialogHeader>

          <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto px-6 py-4">
            {filteredDeadlines.map((d) => (
              <DeadlineDetailRow key={d.id} deadline={d} />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
