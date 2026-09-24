import { useMemo, useState } from "react";
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
  ListChecks,
  User,
  Users,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

// ---------------------------------------------------------------------------
// Stage model
// ---------------------------------------------------------------------------
// Capstone projects move through four stages. Ownership of "who's primarily
// watching this project right now" shifts from instructor to advisor as the
// project matures. This is the single source of truth that drives sorting,
// badges, and the "needs your attention" section below.

type Role = "instructor" | "advisor";
type HealthStatus = "healthy" | "at_risk" | "critical";

type Stage = {
  id: number;
  label: string;
  primaryRole: Role;
};

const STAGES: Stage[] = [
  { id: 0, label: "Proposal", primaryRole: "instructor" },
  { id: 1, label: "Development", primaryRole: "instructor" },
  { id: 2, label: "Testing & revision", primaryRole: "advisor" },
  { id: 3, label: "Defense prep", primaryRole: "advisor" },
];

const HEALTH: Record<
  HealthStatus,
  { label: string; rank: number; className: string }
> = {
  healthy: {
    label: "On track",
    rank: 0,
    className: "bg-emerald-100 text-emerald-700",
  },
  at_risk: {
    label: "At risk",
    rank: 1,
    className: "bg-amber-100 text-amber-700",
  },
  critical: {
    label: "Critical",
    rank: 2,
    className: "bg-rose-100 text-rose-700",
  },
};

type MockProject = {
  id: string;
  name: string;
  role: Role;
  stageId: number;
  health: HealthStatus;
  progress: number;
  pendingSubmissions: number;
  lastActivity: string;
  lastActivityTime: string;
};

// ---------------------------------------------------------------------------
// Mock data — swap for useGetInstructorProjects / useGetAdvisorProjects
// ---------------------------------------------------------------------------

const MOCK_PROJECTS: MockProject[] = [
  {
    id: "p1",
    name: "Adaptive Irrigation Scheduling for Smallholder Farms",
    role: "instructor",
    stageId: 0,
    health: "at_risk",
    progress: 22,
    pendingSubmissions: 3,
    lastActivity: "Submitted literature review draft",
    lastActivityTime: "3h ago",
  },
  {
    id: "p2",
    name: "Campus Wayfinding App for Visually Impaired Students",
    role: "instructor",
    stageId: 1,
    health: "critical",
    progress: 38,
    pendingSubmissions: 2,
    lastActivity: "Missed sprint checkpoint",
    lastActivityTime: "1d ago",
  },
  {
    id: "p3",
    name: "Low-Cost Water Quality Sensor Network",
    role: "advisor",
    stageId: 2,
    health: "healthy",
    progress: 64,
    pendingSubmissions: 1,
    lastActivity: "Uploaded revised methodology",
    lastActivityTime: "5h ago",
  },
  {
    id: "p4",
    name: "Peer Tutoring Matchmaking Platform",
    role: "advisor",
    stageId: 3,
    health: "healthy",
    progress: 88,
    pendingSubmissions: 0,
    lastActivity: "Scheduled defense run-through",
    lastActivityTime: "2d ago",
  },
  {
    id: "p5",
    name: "Household Waste Segregation Incentive System",
    role: "instructor",
    stageId: 2,
    health: "at_risk",
    progress: 55,
    pendingSubmissions: 2,
    lastActivity: "Requested extension on Chapter 3",
    lastActivityTime: "6h ago",
  },
  {
    id: "p6",
    name: "Voice-Controlled Lab Equipment Interface",
    role: "advisor",
    stageId: 1,
    health: "healthy",
    progress: 41,
    pendingSubmissions: 1,
    lastActivity: "Completed wireframe review",
    lastActivityTime: "1d ago",
  },
  {
    id: "p7",
    name: "Community Bulletin Board for Barangay Announcements",
    role: "instructor",
    stageId: 3,
    health: "healthy",
    progress: 91,
    pendingSubmissions: 0,
    lastActivity: "Final manuscript approved",
    lastActivityTime: "3d ago",
  },
  {
    id: "p8",
    name: "Renewable Energy Micro-grid Monitoring Dashboard",
    role: "instructor",
    stageId: 0,
    health: "critical",
    progress: 15,
    pendingSubmissions: 4,
    lastActivity: "Team requested proposal deadline extension",
    lastActivityTime: "12h ago",
  },
  {
    id: "p9",
    name: "AI-Assisted Crop Disease Detection for Rice Farmers",
    role: "advisor",
    stageId: 3,
    health: "at_risk",
    progress: 82,
    pendingSubmissions: 1,
    lastActivity: "Draft manuscript flagged for revision",
    lastActivityTime: "9h ago",
  },
];

type MockDeadline = {
  id: string;
  projectId: string;
  projectName: string;
  role: Role;
  title: string;
  studentName: string;
  note: string;
  daysFromNow: number; // negative = overdue, 0 = due today
};

const MOCK_DEADLINES: MockDeadline[] = [
  {
    id: "d1",
    projectId: "p2",
    projectName: "Campus Wayfinding App for Visually Impaired Students",
    role: "instructor",
    title: "Sprint 2 checkpoint report due",
    studentName: "Carlo Diaz",
    note: "No submission yet — sprint checkpoints are graded and count toward the Development milestone.",
    daysFromNow: -1,
  },
  {
    id: "d2",
    projectId: "p1",
    projectName: "Adaptive Irrigation Scheduling for Smallholder Farms",
    role: "instructor",
    title: "Chapter 1-2 defense",
    studentName: "Miguel Santos, Ana Reyes",
    note: "Panel room and reviewers already confirmed; only your sign-off is pending.",
    daysFromNow: 0,
  },
  {
    id: "d3",
    projectId: "p5",
    projectName: "Household Waste Segregation Incentive System",
    role: "instructor",
    title: "Chapter 3 revision due",
    studentName: "Trisha Uy",
    note: "Second resubmission after requested changes to the methodology section.",
    daysFromNow: 2,
  },
  {
    id: "d4",
    projectId: "p3",
    projectName: "Low-Cost Water Quality Sensor Network",
    role: "advisor",
    title: "Methodology panel review",
    studentName: "Bea Lim",
    note: "Advisor sign-off needed before the panel packet goes out this week.",
    daysFromNow: 4,
  },
  {
    id: "d5",
    projectId: "p6",
    projectName: "Voice-Controlled Lab Equipment Interface",
    role: "advisor",
    title: "Prototype demo checkpoint",
    studentName: "Nico Aquino",
    note: "Live demo of the voice command pipeline; hardware has already been tested.",
    daysFromNow: 6,
  },
  {
    id: "d6",
    projectId: "p4",
    projectName: "Peer Tutoring Matchmaking Platform",
    role: "advisor",
    title: "Final defense",
    studentName: "Full team",
    note: "Manuscript approved — this is the last checkpoint before graduation clearance.",
    daysFromNow: 9,
  },
  {
    id: "d7",
    projectId: "p1",
    projectName: "Adaptive Irrigation Scheduling for Smallholder Farms",
    role: "instructor",
    title: "Related literature matrix due",
    studentName: "Ana Reyes",
    note: "First submission for this deliverable, tied to the Proposal milestone.",
    daysFromNow: 12,
  },
];

type Urgency = "overdue" | "today" | "soon" | "later";

function urgencyOf(daysFromNow: number): Urgency {
  if (daysFromNow < 0) return "overdue";
  if (daysFromNow === 0) return "today";
  if (daysFromNow <= 3) return "soon";
  return "later";
}

const URGENCY_STYLES: Record<
  Urgency,
  { dateClass: string; label: (d: number) => string }
> = {
  overdue: {
    dateClass: "bg-rose-100 text-rose-700",
    label: (d) => `${Math.abs(d)}d overdue`,
  },
  today: {
    dateClass: "bg-rose-100 text-rose-700",
    label: () => "Due today",
  },
  soon: {
    dateClass: "bg-amber-100 text-amber-700",
    label: (d) => `In ${d}d`,
  },
  later: {
    dateClass: "bg-neutral-100 text-neutral-600",
    label: (d) => `In ${d}d`,
  },
};

function formatDeadlineDate(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function stageOf(stageId: number): Stage {
  return STAGES.find((s) => s.id === stageId) ?? STAGES[0];
}

// The max number of rows shown inline in each card before it's capped and
// a "View all" dialog takes over. Kept equal so both cards land at a
// similar height instead of one stretching to fill empty space.
const ATTENTION_VISIBLE_LIMIT = 4;
const DEADLINE_VISIBLE_LIMIT = 3;

// ---------------------------------------------------------------------------
// Small presentational bits
// ---------------------------------------------------------------------------

function HealthBadge({ health }: { health: HealthStatus }) {
  const info = HEALTH[health] ?? HEALTH.healthy;
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${info.className}`}
    >
      {info.label}
    </span>
  );
}

function RoleBadge({ role }: { role: Role }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.06em] ${
        role === "instructor"
          ? "bg-[#F3EFE6] text-[#7A0C2E]"
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
      <p className="mt-1 text-sm text-neutral-500">
        {caption}
      </p>
    </Card>
  );
}

// Full-detail row used inside the "View all" dialog — same data as the
// inline row, just with more breathing room since it's not space-constrained.
function AttentionDetailRow({
  project,
}: {
  project: MockProject & { stage: Stage; isPrimary: boolean };
}) {
  return (
    <div className="rounded-xl border p-4 bg-card">
      <div className="flex flex-wrap items-center gap-2">
        <RoleBadge role={project.role} />
        <HealthBadge health={project.health} />
        <span className="text-xs font-medium text-neutral-400">
          {project.stage.label}
        </span>
      </div>
      <h3 className="mt-2 text-base font-semibold text-foreground">
        {project.name}
      </h3>
      <p className="mt-1 text-sm text-neutral-500">
        {project.lastActivity} · {project.lastActivityTime}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-neutral-600">
        <span>{project.progress}% complete</span>
        {project.pendingSubmissions > 0 && (
          <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600">
            {project.pendingSubmissions} pending
          </span>
        )}
      </div>
    </div>
  );
}

// Full-detail row used inside the deadlines "View all" dialog.
function DeadlineDetailRow({
  deadline,
  stageLabel,
}: {
  deadline: MockDeadline;
  stageLabel?: string;
}) {
  const urgency = urgencyOf(deadline.daysFromNow);
  const style = URGENCY_STYLES[urgency];
  return (
    <div className="rounded-xl border p-4 bg-card">
      <div className="flex flex-wrap items-center gap-2">
        <RoleBadge role={deadline.role} />
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${style.dateClass}`}
        >
          {style.label(deadline.daysFromNow)} ·{" "}
          {formatDeadlineDate(deadline.daysFromNow)}
        </span>
        {stageLabel && (
          <span className="text-xs font-medium text-neutral-400">
            {stageLabel}
          </span>
        )}
      </div>
      <h3 className="mt-2 text-base font-semibold text-foreground">
        {deadline.title}
      </h3>
      <p className="mt-1 text-sm font-medium text-neutral-600">
        {deadline.projectName}
      </p>
      <div className="mt-2 flex items-center gap-1.5 text-sm text-neutral-500">
        <User size={13} />
        {deadline.studentName}
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">
        {deadline.note}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function InstructorDashboard() {
  const [filter, setFilter] = useState<Role | "all">("all");
  const [attentionDialogOpen, setAttentionDialogOpen] = useState(false);
  const [deadlineDialogOpen, setDeadlineDialogOpen] = useState(false);

  const projects = useMemo(
    () =>
      MOCK_PROJECTS.map((p) => ({
        ...p,
        stage: stageOf(p.stageId),
        isPrimary: stageOf(p.stageId).primaryRole === p.role,
      })),
    [],
  );

  const filteredDeadlines = MOCK_DEADLINES.filter(
    (d) => filter === "all" || d.role === filter,
  ).sort((a, b) => a.daysFromNow - b.daysFromNow);

  const visibleDeadlines = filteredDeadlines.slice(0, DEADLINE_VISIBLE_LIMIT);
  const hasMoreDeadlines = filteredDeadlines.length > DEADLINE_VISIBLE_LIMIT;

  const needsAttentionAll = [...projects]
    .filter((p) => p.isPrimary)
    .sort((a, b) => {
      const healthDiff =
        (HEALTH[b.health]?.rank ?? 0) - (HEALTH[a.health]?.rank ?? 0);
      if (healthDiff !== 0) return healthDiff;
      return b.pendingSubmissions - a.pendingSubmissions;
    });

  const needsAttention = needsAttentionAll.slice(0, ATTENTION_VISIBLE_LIMIT);
  const hasMoreAttention = needsAttentionAll.length > ATTENTION_VISIBLE_LIMIT;

  const stats = {
    total: projects.length,
    atRisk: projects.filter((p) => p.health !== "healthy").length,
    pendingReviews: projects.reduce((sum, p) => sum + p.pendingSubmissions, 0),
    yourTurn: projects.filter((p) => p.isPrimary).length,
  };

  const stageChartData = STAGES.map((s) => ({
    stage: s.label,
    count: projects.filter((p) => p.stageId === s.id).length,
  }));

  const activityFeed = [...projects].sort((a, b) =>
    a.lastActivityTime.localeCompare(b.lastActivityTime),
  );

  return (
    <AppLayout breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }]}>
      <div className="min-h-screen w-full py-0 font-sans antialiased">
        <div className="mb-5">
          <h1 className="my-2 text-2xl font-bold text-foreground">Your projects</h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-semiforeground">
            A portfolio view across everything you're instructing or advising.
          </p>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            icon={<Layers size={16} className="text-[#7A0C2E]" />}
            label="Active projects"
            value={stats.total}
            caption="Across both roles"
            accent="bg-[#F3EFE6]"
          />
          <StatCard
            icon={<AlertTriangle size={16} className="text-rose-600" />}
            label="At risk or critical"
            value={stats.atRisk}
            caption="Need a closer look"
            accent="bg-rose-50"
          />
          <StatCard
            icon={<ClipboardCheck size={16} className="text-[#C9A84C]" />}
            label="Pending submissions"
            value={stats.pendingReviews}
            caption="Waiting on your review"
            accent="bg-[#FBF3E7]"
          />
          <StatCard
            icon={<Clock size={16} className="text-[#3F3350]" />}
            label="Currently your turn"
            value={stats.yourTurn}
            caption="Primary reviewer by stage"
            accent="bg-[#EFEAF6]"
          />
        </div>

        {/* Needs your attention + deadline timeline, side by side */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2 lg:items-stretch">
          <Card className="flex h-full flex-col shadow-sm border">
            <div className="flex items-center justify-between border-b border-neutral px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-rose-50 p-2 text-rose-600">
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
                  key={p.id}
                  className="flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <RoleBadge role={p.role} />
                      <HealthBadge health={p.health} />
                      <span className="text-xs font-medium text-neutral-400">
                        {p.stage.label}
                      </span>
                    </div>
                    <h3 className="mt-1.5 text-base font-semibold leading-snug text-foreground">
                      {p.name}
                    </h3>
                    <p className="mt-0.5 text-sm text-neutral-500">
                      {p.lastActivity} · {p.lastActivityTime}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 sm:shrink-0">
                    {p.pendingSubmissions > 0 && (
                      <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600">
                        {p.pendingSubmissions} pending
                      </span>
                    )}
                    <Button size="sm" variant="outline" className="gap-1.5">
                      Review
                      <ChevronRight size={14} />
                    </Button>
                  </div>
                </div>
              ))}

              {needsAttention.length === 0 && (
                <div className="px-5 py-8 text-center text-sm text-neutral-500">
                  Nothing needs your attention right now.
                </div>
              )}
            </div>

            {hasMoreAttention && (
              <div className="border-t px-5 py-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-center gap-1.5  text-[#7A0C2E] hover:text-[#7A0C2E] dark:text-[#c82659] dark:hover:text-[#7A0C2E]"
                  onClick={() => setAttentionDialogOpen(true)}
                >
                  View all {needsAttentionAll.length}
                  <ChevronRight size={14} />
                </Button>
              </div>
            )}
          </Card>

          {/* Deadline timeline, filterable by role */}
          <Card className="flex h-full flex-col border  shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-[#FBF3E7] p-2 text-[#C9A84C]">
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
                        : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 px-5 py-4">
              {visibleDeadlines.map((d, i) => {
                const urgency = urgencyOf(d.daysFromNow);
                const style = URGENCY_STYLES[urgency];
                const stageLabel = projects.find((p) => p.id === d.projectId)
                  ?.stage.label;
                return (
                  <div key={d.id} className="flex gap-4">
                    {/* date badge + connecting line */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl text-xs font-semibold tabular-nums ${style.dateClass}`}
                      >
                        {formatDeadlineDate(d.daysFromNow)}
                      </div>
                      {i < visibleDeadlines.length - 1 && (
                        <div className="w-px flex-1 bg-neutral-200" />
                      )}
                    </div>

                    <div className="flex min-w-0 flex-1 items-start justify-between gap-4 pb-6">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <RoleBadge role={d.role} />
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${style.dateClass}`}
                          >
                            {style.label(d.daysFromNow)}
                          </span>
                          {stageLabel && (
                            <span className="text-xs text-neutral-400">
                              {stageLabel}
                            </span>
                          )}
                        </div>

                        <h3 className="mt-1.5 text-base font-semibold leading-snug text-foreground">
                          {d.title}
                        </h3>
                        <p className="mt-0.5 text-sm font-medium text-neutral-600">
                          {d.projectName}
                        </p>

                        <div className="mt-2 flex items-center gap-1.5 text-sm text-neutral-500">
                          <User size={13} />
                          {d.studentName}
                        </div>
                        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-neutral-500">
                          {d.note}
                        </p>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 gap-1.5"
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

        {/* Stage distribution + activity feed, side by side */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card className="p-5 shadow-sm">
            <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <ListChecks size={18} className="text-[#7A0C2E]" />
              Projects by stage
            </div>
            <ChartContainer
              config={{ count: { label: "Projects", color: "#7A0C2E" } }}
              className="mt-4 h-65 w-full"
            >
              <BarChart
                data={stageChartData}
                layout="vertical"
                margin={{ left: 0 }}
              >
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <XAxis type="number" hide allowDecimals={false} />
                <YAxis
                  dataKey="stage"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  width={130}
                  tick={{ fontSize: 13 }}
                  tickFormatter={(v) => v}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Bar dataKey="count" fill="#7A0C2E" radius={5} barSize={28} />
              </BarChart>
            </ChartContainer>
          </Card>

          <Card className="border p-5 shadow-sm">
            <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Activity size={18} className="text-[#C9A84C]" />
              Recent activity
            </div>
            <div className="mt-4 space-y-4">
              {activityFeed.map((p) => (
                <div key={p.id} className="flex items-start gap-3">
                  <div className="mt-1 rounded-full bg-neutral-100 p-2 text-neutral-500">
                    {p.pendingSubmissions > 0 ? (
                      <FileText size={14} />
                    ) : (
                      <CheckCircle2 size={14} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {p.name}
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {p.lastActivity} · {p.lastActivityTime}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="mt-6 flex items-start gap-2 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-accent p-4 text-xs text-neutral-500">
          <Users size={14} className="mt-0.5 shrink-0" />
          <p>
            Same dashboard for instructors and advisors. "Your call this stage"
            marks projects where you're the primary reviewer given the current
            stage — you can still open any project you're attached to regardless
            of whose turn it is.
          </p>
        </div>
      </div>

      {/* Full "needs your attention" list, only reachable when there are
          more items than the inline card shows */}
      <Dialog open={attentionDialogOpen} onOpenChange={setAttentionDialogOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl custom-scrollbar">
          <DialogHeader>
            <DialogTitle>Needs your attention</DialogTitle>
            <DialogDescription>
              All {needsAttentionAll.length} projects where you're the primary
              reviewer this stage, sorted by health then pending items.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 space-y-3">
            {needsAttentionAll.map((p) => (
              <AttentionDetailRow key={p.id} project={p} />
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Full deadlines list, respects the current instructor/advisor filter
          and only reachable when there are more than the inline card shows */}
      <Dialog open={deadlineDialogOpen} onOpenChange={setDeadlineDialogOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl custom-scrollbar">
          <DialogHeader>
            <DialogTitle>Upcoming deadlines</DialogTitle>
            <DialogDescription>
              All {filteredDeadlines.length} deadlines
              {filter !== "all" ? ` as ${filter}` : ""}, soonest first.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 space-y-3">
            {filteredDeadlines.map((d) => (
              <DeadlineDetailRow
                key={d.id}
                deadline={d}
                stageLabel={
                  projects.find((p) => p.id === d.projectId)?.stage.label
                }
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
