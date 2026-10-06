import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  File as FileIcon,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  FolderKanban,
  RefreshCw,
  ShieldCheck,
  UsersRound,
  Waypoints,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import AppLayout from "@/layouts/Applayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminMetrics } from "@/hooks/useAdminMetrics";
import type { AdminMetricsOverview } from "@/types/admin_metrics";

const numberFormat = new Intl.NumberFormat();

const roleColors = {
  student: "#7b1113",
  instructor: "#B88A22",
  admin: "#16766F",
} as const;

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  icon: typeof UsersRound;
  tone: "maroon" | "gold" | "teal" | "blue";
}) {
  const tones = {
    maroon: "bg-[#7A0C2E]/8 text-[#7A0C2E] dark:bg-rose-950/60 dark:text-rose-300",
    gold: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
    teal: "bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300",
    blue: "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300",
  };

  return (
    <Card className="rounded-md py-4 shadow-none">
      <CardContent className="flex items-start justify-between gap-3 px-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">
            {numberFormat.format(value)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-md ${tones[tone]}`}>
          <Icon className="size-4" />
        </span>
      </CardContent>
    </Card>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-5" aria-label="Loading system metrics" aria-busy="true">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-md" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-md" />
        <Skeleton className="h-72 rounded-md" />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-64 rounded-md" />
        <Skeleton className="h-64 rounded-md" />
        <Skeleton className="h-72 rounded-md xl:col-span-2" />
      </div>
    </div>
  );
}

function RoleComposition({ metrics }: { metrics: AdminMetricsOverview["users"] }) {
  const roleEntries = Object.entries(metrics.by_role) as [keyof typeof roleColors, number][];
  let offset = 0;
  const slices = roleEntries.map(([role, count]) => {
    const start = offset;
    const size = metrics.total > 0 ? (count / metrics.total) * 100 : 0;
    offset += size;
    return `${roleColors[role]} ${start}% ${offset}%`;
  });

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
      <div
        className="relative mx-auto flex size-36 shrink-0 items-center justify-center rounded-full sm:mx-0"
        style={{ background: `conic-gradient(${slices.join(", ") || "#e5e7eb 0% 100%"})` }}
        role="img"
        aria-label={`${numberFormat.format(metrics.total)} users, distributed by role`}
      >
        <div className="flex size-24 flex-col items-center justify-center rounded-full bg-card text-center">
          <span className="text-2xl font-semibold tabular-nums">{numberFormat.format(metrics.total)}</span>
          <span className="text-xs text-muted-foreground">accounts</span>
        </div>
      </div>
      <div className="grid flex-1 gap-3">
        {roleEntries.map(([role, count]) => {
          const share = metrics.total ? Math.round((count / metrics.total) * 100) : 0;
          return (
            <div key={role} className="flex items-center gap-2.5">
              <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: roleColors[role] }} />
              <span className="min-w-0 flex-1 text-sm capitalize">{role}</span>
              <span className="text-sm font-medium tabular-nums">{numberFormat.format(count)}</span>
              <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{share}%</span>
            </div>
          );
        })}
        <div className="mt-1 border-t pt-3 text-xs text-muted-foreground">
          {numberFormat.format(metrics.active)} active
          <span className="px-1.5">/</span>
          {numberFormat.format(metrics.inactive)} inactive
        </div>
        <Button asChild variant="link" className="h-auto justify-start p-0 text-xs">
          <Link to="/admin/users">Manage user accounts</Link>
        </Button>
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** unitIndex;
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function relativeTime(value: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "Date unavailable";
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (elapsedSeconds < 60) return "just now";
  if (elapsedSeconds < 3600) return `${Math.floor(elapsedSeconds / 60)}m ago`;
  if (elapsedSeconds < 86400) return `${Math.floor(elapsedSeconds / 3600)}h ago`;
  if (elapsedSeconds < 604800) return `${Math.floor(elapsedSeconds / 86400)}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

type FileKind = {
  label: string;
  icon: LucideIcon;
  color: string; // used for the segmented bar and progress fill
  chip: string; // icon container classes
};

function getFileKind(contentType: string): FileKind {
  const type = (contentType || "").toLowerCase();
  const subtype = type.split("/")[1]?.split(";")[0]?.split(".").pop()?.split("+")[0] ?? "";
  const short = subtype ? subtype.toUpperCase() : "Unknown";

  if (type.startsWith("image/"))
    return { label: `${short} image`, icon: FileImage, color: "#B88A22", chip: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300" };
  if (type.startsWith("video/"))
    return { label: `${short} video`, icon: FileVideo, color: "#7A0C2E", chip: "bg-[#7A0C2E]/10 text-[#7A0C2E] dark:bg-rose-950/60 dark:text-rose-300" };
  if (type.startsWith("audio/"))
    return { label: `${short} audio`, icon: FileAudio, color: "#6D5BD0", chip: "bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300" };
  if (type.includes("pdf"))
    return { label: "PDF document", icon: FileText, color: "#DC2626", chip: "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300" };
  if (type.includes("spreadsheet") || type.includes("excel") || type.includes("csv"))
    return { label: "Spreadsheet", icon: FileSpreadsheet, color: "#16766F", chip: "bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300" };
  if (type.includes("zip") || type.includes("compressed") || type.includes("tar") || type.includes("rar"))
    return { label: "Archive", icon: FileArchive, color: "#64748B", chip: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" };
  if (type.includes("json") || type.includes("javascript") || type.includes("xml") || type.includes("html"))
    return { label: short, icon: FileCode, color: "#0284C7", chip: "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300" };
  if (type.startsWith("text/") || type.includes("word") || type.includes("presentation") || type.includes("document"))
    return { label: type.includes("word") ? "Word document" : type.includes("presentation") ? "Presentation" : "Text document", icon: FileText, color: "#2563EB", chip: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300" };

  return { label: contentType ? short : "Unknown file type", icon: FileIcon, color: "#94A3B8", chip: "bg-muted text-muted-foreground" };
}

function FileTypeBreakdown({
  items,
  total,
}: {
  items: AdminMetricsOverview["files"]["by_type"];
  total: number;
}) {
  const list = items ?? [];

  if (list.length === 0) {
    return (
      <div className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-center">
        <FileIcon className="size-5 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">No file records yet.</p>
      </div>
    );
  }

  const enriched = list
    .map((item) => ({
      ...item,
      kind: getFileKind(item.content_type),
      share: total > 0 ? Math.min(100, (item.count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-4">
      {/* Segmented distribution bar */}
      <div>
        <div
          className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-muted"
          role="img"
          aria-label="File type distribution"
        >
          {enriched.map((item) => (
            <div
              key={item.content_type}
              className="h-full first:rounded-l-full last:rounded-r-full transition-[width] duration-500"
              style={{ width: `${item.share}%`, backgroundColor: item.kind.color }}
              title={`${item.kind.label}: ${item.share.toFixed(1)}%`}
            />
          ))}
        </div>
        <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
          {enriched.slice(0, 5).map((item) => (
            <span key={item.content_type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-2 rounded-full" style={{ backgroundColor: item.kind.color }} />
              {item.kind.label}
            </span>
          ))}
          {enriched.length > 5 && (
            <span className="text-xs text-muted-foreground">+{enriched.length - 5} more</span>
          )}
        </div>
      </div>

      {/* Type cards */}
      <ul className="grid max-h-72 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-2">
        {enriched.map((item) => {
          const Icon = item.kind.icon;
          return (
            <li
              key={item.content_type}
              className="group rounded-xl border bg-card p-3 transition-colors hover:bg-muted/40"
            >
              <div className="flex items-center gap-3">
                <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${item.kind.chip}`}>
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" title={item.content_type}>
                    {item.kind.label}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {numberFormat.format(item.count)} {item.count === 1 ? "file" : "files"} · {formatBytes(item.total_size_bytes)}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {item.share < 1 && item.share > 0 ? "<1" : Math.round(item.share)}%
                </span>
              </div>
              <div
                className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-label={`${item.kind.label} share of file records`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(item.share)}
              >
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{ width: `${item.share}%`, backgroundColor: item.kind.color }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function FilesInDatabase({ metrics }: { metrics: AdminMetricsOverview["files"] }) {
  const typeSummary = metrics.by_type ?? [];

  return (
    <Card className="rounded-md py-0 shadow-none">
      <CardHeader className="border-b px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Files in database</CardTitle>
            <CardDescription className="mt-1">
              File metadata records; contents are stored in Supabase.
            </CardDescription>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xl font-semibold tabular-nums">{numberFormat.format(metrics.total)}</p>
            <p className="text-xs text-muted-foreground">file records</p>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {formatBytes(metrics.total_size_bytes)} tracked · {numberFormat.format(metrics.new_last_30_days)} added in 30 days
        </p>
      </CardHeader>
      <CardContent className="space-y-4 px-4">
        <section aria-label="File records by content type">
          <h3 className="py-3 text-xs font-medium text-muted-foreground">Breakdown by file type</h3>
          <FileTypeBreakdown items={typeSummary} total={metrics.total} />
        </section>
      </CardContent>
    </Card>
  );
}

function activityDescription(type: string, actor: string, target: string): string {
  switch (type) {
    case "project_created":
      return `${actor} created project ${target}`;
    case "project_updated":
      return `${actor} updated project ${target}`;
    case "project_deleted":
      return `${actor} deleted project ${target}`;
    case "task_created":
      return `${actor} created task ${target}`;
    case "task_submitted":
      return `${actor} submitted task ${target}`;
    case "task_completed":
      return `${actor} completed task ${target}`;
    case "task_deleted":
      return `${actor} deleted task ${target}`;
    case "role_changed":
      return `${actor} changed the role for ${target}`;
    case "account_deactivated":
      return `${actor} deactivated ${target}`;
    case "account_reactivated":
      return `${actor} reactivated ${target}`;
    case "account_soft_deleted":
      return `${actor} removed ${target}`;
    case "account_created":
      return `${actor} created account ${target}`;
    case "password_reset":
      return `${actor} reset the password for ${target}`;
    case "login_failed":
      return "A sign-in attempt was rejected";
    default:
      return `${actor} updated ${target}`;
  }
}

const activityIcons: Record<string, LucideIcon> = {
  project_created: FolderKanban,
  project_updated: FolderKanban,
  project_deleted: FolderKanban,
  task_created: Workflow,
  task_submitted: CheckCircle2,
  task_completed: CheckCircle2,
  task_deleted: Workflow,
  role_changed: ShieldCheck,
  account_deactivated: CircleDashed,
  account_reactivated: CheckCircle2,
  account_soft_deleted: CircleDashed,
  account_created: UsersRound,
  password_reset: ShieldCheck,
  login_failed: AlertTriangle,
};

function AccountHealth({ metrics }: { metrics: AdminMetricsOverview["users"] }) {
  const stats = [
    ["New · 7 days", metrics.new_last_7_days],
    ["New · 30 days", metrics.new_last_30_days],
    ["Active · 7 days", metrics.active_last_7_days],
    ["Active · 30 days", metrics.active_last_30_days],
    ["Unverified", metrics.unverified],
    ["Unverified · 7+ days", metrics.unverified_older_than_7_days],
    ["Soft-deleted", metrics.soft_deleted_total],
    ["Failed sign-ins · 24h", metrics.failed_logins_last_24h],
  ] as const;

  return (
    <Card className="rounded-md py-0 shadow-none">
      <CardHeader className="border-b px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Account health</CardTitle>
            <CardDescription className="mt-1">Signups, recent sign-ins, and verification.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-x-4 gap-y-5 px-4 py-5 sm:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <p className="truncate text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{numberFormat.format(value)}</p>
          </div>
        ))}
        <div className="col-span-2 border-t pt-3 text-xs text-muted-foreground sm:col-span-4">
          Signup-age and sign-in history begin with this tracking rollout; older account history was not recorded.
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityFeed({ metrics }: { metrics: AdminMetricsOverview["activity"] }) {
  const [view, setView] = useState<"all" | "admin">("all");
  const rows: {
    id: string;
    type: string;
    actor: string;
    target_label: string;
    created_at: string;
  }[] = view === "all"
    ? (metrics.recent ?? []).map((item) => ({
        id: item.id,
        type: item.type,
        actor: item.actor_name,
        target_label: item.target_label,
        created_at: item.created_at,
      }))
    : (metrics.admin_actions ?? []).map((item) => ({
        id: item.id,
        type: item.action,
        actor: item.admin_name,
        target_label: item.target_label,
        created_at: item.created_at,
      }));

  return (
    <Card className="rounded-md py-0 shadow-none xl:col-span-2">
      <CardHeader className="border-b px-4 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription className="mt-1">Latest recorded changes across the platform.</CardDescription>
          </div>
          <div className="inline-flex w-fit rounded-md border p-0.5" role="tablist" aria-label="Activity filter">
            <button
              type="button"
              role="tab"
              aria-selected={view === "all"}
              className={`rounded px-2.5 py-1 text-xs ${view === "all" ? "bg-muted font-medium text-foreground" : "text-muted-foreground"}`}
              onClick={() => setView("all")}
            >
              All activity
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "admin"}
              className={`rounded px-2.5 py-1 text-xs ${view === "admin" ? "bg-muted font-medium text-foreground" : "text-muted-foreground"}`}
              onClick={() => setView("admin")}
            >
              Admin actions
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4">
        {rows.length === 0 ? (
          <div className="flex min-h-36 flex-col items-center justify-center gap-2 text-center">
            <CircleDashed className="size-5 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-medium">No activity recorded yet</p>
            <p className="text-xs text-muted-foreground">New project, task, and account events will appear here.</p>
          </div>
        ) : (
          <ul className="divide-y" aria-label={view === "all" ? "Recent activity" : "Recent admin actions"}>
            {rows.map((item) => {
              const Icon = activityIcons[item.type] ?? CircleDashed;
              return (
                <li key={item.id} className="flex min-w-0 items-center gap-3 py-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground" aria-hidden="true">
                    <Icon className="size-4" />
                  </span>
                  <p className="min-w-0 flex-1 truncate text-sm" title={activityDescription(item.type, item.actor, item.target_label)}>
                    {activityDescription(item.type, item.actor, item.target_label)}
                  </p>
                  <time className="shrink-0 text-xs text-muted-foreground" dateTime={item.created_at} title={Number.isFinite(Date.parse(item.created_at)) ? new Date(item.created_at).toLocaleString() : "Date unavailable"}>
                    {relativeTime(item.created_at)}
                  </time>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function HealthDot({ status, label }: { status: AdminMetricsOverview["system"]["api"]["status"]; label: string }) {
  const tone = {
    operational: "bg-emerald-600",
    degraded: "bg-amber-500",
    down: "bg-rose-600",
  }[status];
  return <span className={`size-2 shrink-0 rounded-full ${tone}`} role="img" aria-label={`${label}: ${status}`} title={`${label}: ${status}`} />;
}

function SystemHealth({
  metrics,
  memberships,
}: {
  metrics: AdminMetricsOverview["system"];
  memberships: number;
}) {
  const limit = metrics.storage.limit_bytes;
  const used = Math.max(0, metrics.storage.used_bytes || 0);
  const percent = typeof limit === "number" && limit > 0 ? Math.min(100, (used / limit) * 100) : null;
  const storageTone = percent === null ? "bg-muted" : percent > 95 ? "bg-rose-600" : percent > 80 ? "bg-amber-500" : "bg-teal-600";
  const checkedAt = Date.parse(metrics.checked_at);

  return (
    <Card className="rounded-md py-0 shadow-none">
      <CardHeader className="border-b px-4 py-4">
        <CardTitle>System health</CardTitle>
        <CardDescription className="mt-1">
          Checked {Number.isFinite(checkedAt) ? new Date(checkedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "recently"}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-4 py-4">
        {(["api", "database"] as const).map((service) => {
          const value = metrics[service];
          const label = service === "api" ? "Overview API" : "Database";
          return (
            <div key={service} className="flex items-center gap-2.5">
              <HealthDot status={value.status} label={label} />
              <span className="min-w-0 flex-1 text-sm">{label}</span>
              <Badge variant={value.status === "down" ? "destructive" : "outline"} className="capitalize">
                {value.status}
              </Badge>
              <span className="w-20 text-right text-xs tabular-nums text-muted-foreground">
                {numberFormat.format(Math.max(0, value.response_time_ms || 0))} ms
              </span>
            </div>
          );
        })}
        <div className="flex items-center gap-2.5">
          <Waypoints className="size-4 shrink-0 text-teal-700 dark:text-teal-300" aria-hidden="true" />
          <span className="min-w-0 flex-1 text-sm">Project memberships</span>
          <span className="text-sm font-medium tabular-nums">
            {numberFormat.format(memberships)}
          </span>
        </div>
        <div className="border-t pt-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium">Tracked storage</span>
            <span className="text-sm tabular-nums">
              {formatBytes(used)}{limit && limit > 0 ? ` / ${formatBytes(limit)}` : " used"}
            </span>
          </div>
          {percent === null ? (
            <p className="mt-1.5 text-xs text-muted-foreground">No total storage quota is configured.</p>
          ) : (
            <div className="mt-2 space-y-1.5">
              <div
                className="h-2 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-label="Storage usage"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(percent)}
              >
                <div className={`h-full rounded-full transition-[width] ${storageTone}`} style={{ width: `${percent}%` }} />
              </div>
              <p className="text-right text-xs tabular-nums text-muted-foreground">{Math.round(percent)}% used</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MetricsContent({ metrics }: { metrics: AdminMetricsOverview }) {
  const verificationRate = metrics.users.total
    ? Math.round((metrics.users.verified / metrics.users.total) * 100)
    : 0;
  const generatedAt = new Date(metrics.generated_at);

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="User accounts"
          value={metrics.users.total}
          detail={`${numberFormat.format(metrics.users.active)} active · ${verificationRate}% verified`}
          icon={UsersRound}
          tone="maroon"
        />
        <MetricCard
          label="New signups"
          value={metrics.users.new_last_30_days}
          detail={`${numberFormat.format(metrics.users.new_last_7_days)} in the last 7 days`}
          icon={UsersRound}
          tone="teal"
        />
        <MetricCard
          label="Instructors"
          value={metrics.users.by_role.instructor ?? 0}
          detail="All instructor accounts"
          icon={FolderKanban}
          tone="gold"
        />
        <MetricCard
          label="Students"
          value={metrics.users.by_role.student ?? 0}
          detail="All student accounts"
          icon={UsersRound}
          tone="blue"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
        <Card className="rounded-md py-0 shadow-none">
          <CardHeader className="border-b px-4 py-4">
            <CardTitle>Accounts by role</CardTitle>
            <CardDescription>Active and inactive accounts, excluding soft-deleted users.</CardDescription>
          </CardHeader>
          <CardContent className="px-4 py-5">
            <RoleComposition metrics={metrics.users} />
          </CardContent>
        </Card>

        <FilesInDatabase metrics={metrics.files} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <AccountHealth metrics={metrics.users} />
        <SystemHealth metrics={metrics.system} memberships={metrics.projects.memberships} />
        <ActivityFeed metrics={metrics.activity} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="size-3.5" />
          System counts are aggregated from current records.
        </span>
        <span>
          Updated {Number.isNaN(generatedAt.getTime()) ? "recently" : generatedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
        </span>
      </div>
    </>
  );
}

export default function Overview() {
  const metricsQuery = useAdminMetrics();
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    try {
      await metricsQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <AppLayout breadcrumbs={[{ label: "Dashboard" }]}>
      <main className="mx-auto w-full max-w-7xl space-y-5 px-2 pb-8 sm:px-4">
        <header className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="size-4 text-[#7A0C2E]" />
              PSU Collab · Administration
            </div>
            <h1 className="text-2xl font-semibold text-foreground">System overview</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Current account, project, and task activity across the system.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {metricsQuery.data && (
              <Badge variant="outline" className="h-8 gap-1.5 px-2.5 font-normal text-muted-foreground">
                <span className="size-1.5 rounded-full bg-emerald-600" />
                Live summary
              </Badge>
            )}
            <Button
              variant="outline"
              size="icon"
              title="Refresh metrics"
              aria-label="Refresh system metrics"
              onClick={() => void refresh()}
              disabled={refreshing || metricsQuery.isFetching}
            >
              <RefreshCw className={refreshing || metricsQuery.isFetching ? "animate-spin" : ""} />
            </Button>
          </div>
        </header>

        {metricsQuery.isLoading ? (
          <OverviewSkeleton />
        ) : metricsQuery.isError ? (
          <section className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-md border border-dashed px-5 text-center">
            <AlertTriangle className="size-8 text-destructive" />
            <h2 className="text-base font-semibold">System metrics unavailable</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              The overview endpoint did not return system data. Confirm the backend is available and try again.
            </p>
            <Button variant="outline" onClick={() => void refresh()}>
              Retry
            </Button>
          </section>
        ) : metricsQuery.data ? (
          <MetricsContent metrics={metricsQuery.data} />
        ) : null}
      </main>
    </AppLayout>
  );
}