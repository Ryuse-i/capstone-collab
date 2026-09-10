import { useMemo, useState, type CSSProperties } from "react";
import GanttChart, {
  ViewMode,
  type Task as GanttTask,
  type TaskGroup,
} from "react-modern-gantt";
import "react-modern-gantt/dist/index.css";

import { ViewTaskDialog } from "@/components/user/ViewTaskDialog";

import type { TaskResponseMembers, TaskStatus } from "@/types/task";
import type { UserBase } from "@/types/user";

// -------------------------------------------------------------------------
// Color logic
//
// Fixed, unambiguous color per status:
// - not_started : neutral gray
// - in-progress : blue, intensifying as progress increases
// - submitted   : fixed yellow
// - completed   : fixed green
// -------------------------------------------------------------------------

const NOT_STARTED_COLOR = {
  backgroundColor: "#e2e8f0",
  textColor: "#334155",
};

const SUBMITTED_COLOR = {
  backgroundColor: "#eab308",
  textColor: "#ffffff",
};

const COMPLETED_COLOR = {
  backgroundColor: "#22c55e",
  textColor: "#ffffff",
};

const IN_PROGRESS_HUE = 217; // blue

function solidColorForProgress(hue: number, progress: number) {
  const clamped = Math.min(100, Math.max(0, progress));

  const saturation = 55 + (clamped / 100) * 25;
  const lightness = 70 - (clamped / 100) * 28;

  return {
    backgroundColor: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
    textColor: lightness > 60 ? "#1f2937" : "#ffffff",
  };
}

function pastelColorForProgress(hue: number, progress: number) {
  const clamped = Math.min(100, Math.max(0, progress));

  // For pastel: increase lightness, decrease saturation
  const saturation = 30 + (clamped / 100) * 15; // Lower saturation range
  const lightness = 80 + (clamped / 100) * 10; // Higher lightness range

  return {
    backgroundColor: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
    textColor: lightness > 60 ? "#1f2937" : "#ffffff",
  };
}

// -------------------------------------------------------------------------
// Date + progress resolution per status
// -------------------------------------------------------------------------

/**
 * Normalizes a status value to the canonical TaskStatus form.
 * This project has repeatedly hit backend/frontend enum casing mismatches
 * (e.g. NOT_STARTED vs not_started), so match defensively instead of an
 * exact string comparison that can silently fall through and look like
 * "no color at all". Note the canonical statuses themselves use mixed
 * separators ("not_started" vs "in-progress"), so the hyphen-normalized
 * key is mapped explicitly back to each real value rather than reused as
 * the value directly.
 */
function normalizeStatus(raw: unknown): TaskStatus {
  if (typeof raw !== "string") return "not_started";

  // Trim, lowercase, and convert spaces/underscores to hyphens for matching
  const key = raw.trim().toLowerCase().replace(/[_\s]+/g, "-");

  switch (key) {
    case "not-started":
      return "not_started";
    case "in-progress":
      return "in-progress";
    case "submitted":
      return "submitted";
    case "completed":
      return "completed";
    default:
      console.warn("[TaskGantt] Unrecognized task status:", raw);
      return "not_started";
  }
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/**
 * Parse a date string, falling back to `fallback` if it's missing/invalid.
 */
function safeDate(value: string | null | undefined, fallback: Date): Date {
  if (!value) return fallback;

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

interface Resolved {
  startDate: Date;
  endDate: Date;
  percent: number;
}

/**
 * Bad/overdue data can otherwise produce endDate < startDate,
 * which renders as a negative-width or glitched bar.
 *
 * Guarantee endDate is never before startDate.
 */
function clampRange(startDate: Date, endDate: Date): [Date, Date] {
  return endDate < startDate ? [startDate, startDate] : [startDate, endDate];
}

function resolveTask(task: TaskResponseMembers): Resolved {
  const status: TaskStatus = normalizeStatus(task.status);

  const now = new Date();

  const deadline = task.deadline
    ? safeDate(task.deadline, addDays(now, 7))
    : null;

  switch (status) {
    case "not_started": {
      const start = safeDate(task.started_at, now);
      const end = deadline ?? addDays(start, 7);

      const [startDate, endDate] = clampRange(start, end);

      return {
        startDate,

        endDate,
        percent: 0,
      };
    }

    case "in-progress": {
      const start = safeDate(task.started_at ?? task.created_at, now);

      const end = deadline ?? addDays(start, 7);

      const [startDate, endDate] = clampRange(start, end);

      const total = endDate.getTime() - startDate.getTime();

      // Calculate progress relative to start of today (00:00) to synchronize
      // with the today marker which is fixed at the start of the day.
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);
      const elapsed = Math.max(0, startOfToday.getTime() - startDate.getTime());

      const percent =
        total > 0 ? Math.min(99, Math.max(1, (elapsed / total) * 100)) : 1;

      return {
        startDate,
        endDate,
        percent,
      };
    }

    case "submitted": {
      const start = safeDate(task.started_at ?? task.created_at, now);

      const end = task.completed_at
        ? safeDate(task.completed_at, addDays(start, 1))
        : (deadline ?? addDays(start, 1));

      const [startDate, endDate] = clampRange(start, end);

      return {
        startDate,
        endDate,
        percent: 90,
      };
    }

    case "completed": {
      const start = safeDate(task.started_at ?? task.created_at, now);

      const end = task.completed_at
        ? safeDate(task.completed_at, start)
        : start;

      const [startDate, endDate] = clampRange(start, end);

      return {
        startDate,
        endDate,
        percent: 100,
      };
    }

    default: {
      // This should never happen due to normalizeStatus, but added for TypeScript safety
      const start = safeDate(task.started_at ?? task.created_at, now);
      const end = deadline ?? addDays(start, 7);
      const [startDate, endDate] = clampRange(start, end);
      return {
        startDate,
        endDate,
        percent: 0,
      };
    }
  }
}

// -------------------------------------------------------------------------
// Task colors
// -------------------------------------------------------------------------

function resolveColor(status: TaskStatus, percent: number) {
  switch (status) {
    case "submitted":
      return SUBMITTED_COLOR;

    case "completed":
      return COMPLETED_COLOR;

    case "in-progress": {
      // For in-progress tasks, we return a solid color based on progress.
      // The gradient effect will be handled in the renderTask style.
      return solidColorForProgress(IN_PROGRESS_HUE, percent);
    }

    case "not_started":
    default:
      return NOT_STARTED_COLOR;
  }
}

// -------------------------------------------------------------------------
// Avatar stack
// -------------------------------------------------------------------------

const AVATAR_PALETTE = [
  "#f97316",
  "#8b5cf6",
  "#0ea5e9",
  "#ec4899",
  "#14b8a6",
  "#f59e0b",
];

function avatarColorFor(id: string) {
  let hash = 0;

  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }

  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

function initials(member: UserBase) {
  const a = member.first_name?.[0] ?? "";
  const b = member.last_name?.[0] ?? "";

  return (a + b).toUpperCase() || "?";
}

const MAX_VISIBLE_AVATARS = 3;

function AvatarStack({
  members,
  ringColor,
}: {
  members: UserBase[];
  ringColor: string;
}) {
  if (members.length === 0) {
    return null;
  }

  const visible = members.slice(0, MAX_VISIBLE_AVATARS);

  const overflow = members.length - visible.length;

  const bubbleStyle = (bg: string, marginLeft: number): CSSProperties => ({
    width: 22,
    height: 22,
    marginLeft,
    borderRadius: "9999px",
    border: `2px solid ${ringColor}`,
    backgroundColor: bg,
    color: "#ffffff",
    fontSize: 9,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        marginLeft: 8,
        flexShrink: 0,
      }}
    >
      {visible.map((member, i) => (
        <div
          key={member.id}
          title={`${member.first_name} ${member.last_name}`}
          style={bubbleStyle(avatarColorFor(member.id), i === 0 ? 0 : -8)}
        >
          {initials(member)}
        </div>
      ))}

      {overflow > 0 && (
        <div style={bubbleStyle("#334155", -8)}>+{overflow}</div>
      )}
    </div>
  );
}

// -------------------------------------------------------------------------
// Gantt types
// -------------------------------------------------------------------------

interface GanttCustomTask extends GanttTask {
  status: TaskStatus;
  raw: TaskResponseMembers;
}

interface TaskGanttViewProps {
  tasks: TaskResponseMembers[];

  /**
   * @deprecated No longer rendered — the sidebar (which showed these
   * group names) has been removed. Kept optional so existing callers
   * don't break; safe to stop passing this.
   */
  supertaskNames?: Record<string, string>;

  /** Optional override for task click behavior. */
  onTaskClick?: (task: TaskResponseMembers) => void;

  isLoading?: boolean;
  isError?: boolean;
}

// -------------------------------------------------------------------------
// Gantt styling
//
// Keep the chart itself flat and rectangular.
// Only the individual task bars receive subtle rounding.
// -------------------------------------------------------------------------

const GANTT_CSS_VARS: CSSProperties = {
  ["--rmg-bg-color" as string]: "#ffffff",

  ["--rmg-text-color" as string]: "#000000",

  ["--rmg-border-color" as string]: "#e5e7eb",

  ["--rmg-row-height" as string]: "80px",

  ["--rmg-task-height" as string]: "60px",

  // Subtle rounding instead of a full pill.
  ["--rmg-border-radius" as string]: "6px",

  ["--rmg-marker-color" as string]: "var(--maroon)",

  // Position today marker at start of day (00:00) instead of current time
  // In DAY view, setting to 0% places it at the left edge of today's column
  ["--rmg-today-marker-left" as string]: "0%",
};

// Single flat group. There's no sidebar to show a group label in
// anymore, so grouping by supertask would only add invisible divider
// lines between blocks — one continuous list reads cleaner.

// -------------------------------------------------------------------------
// Component
// -------------------------------------------------------------------------

export function TaskGanttView({
  tasks,
  onTaskClick,
  isLoading = false,
  isError = false,
}: TaskGanttViewProps) {
  const [selectedTask, setSelectedTask] = useState<TaskResponseMembers | null>(
    null,
  );

  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  // Today marker position is now controlled via CSS variable --rmg-today-marker-left
// Set to "0%" to position it at the start of today's column (00:00)

  // -----------------------------------------------------------------------
  // Task click
  // -----------------------------------------------------------------------

  const handleTaskClick = (task: TaskResponseMembers) => {
    if (onTaskClick) {
      onTaskClick(task);
      return;
    }

    setSelectedTask(task);
    setViewDialogOpen(true);
  };

  const handleViewDialogChange = (open: boolean) => {
    setViewDialogOpen(open);

    if (!open) {
      setSelectedTask(null);
    }
  };

  // -----------------------------------------------------------------------
  // Build one flat task group (no supertask grouping — see note above)
  // -----------------------------------------------------------------------

  const groups = useMemo<TaskGroup[]>(() => {
    if (tasks.length === 0) return [];

    return tasks
      .map((task) => {
        const status: TaskStatus = normalizeStatus(task.status);
        const { startDate, endDate, percent } = resolveTask(task);

        const ganttTask: GanttCustomTask = {
          id: task.id,
          name: task.name,
          startDate,
          endDate,
          percent,
          status,
          raw: task,
        };

        return {
          id: task.id, // one group per task
          name: task.name,
          tasks: [ganttTask], // single task in that group
        };
      })
      .sort(
        (a, b) =>
          a.tasks[0].startDate.getTime() - b.tasks[0].startDate.getTime(),
      );
  }, [tasks]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="mt-6">
      <div
        className="relative overflow-visible"
        style={{
          /*
           * react-modern-gantt uses fixed-position elements internally.
           *
           * transform keeps the library's positioned elements anchored to
           * this chart without clipping the full task stack.
           */
          transform: "translateZ(0)",
          contain: "layout",

          ...GANTT_CSS_VARS,
        }}
      >
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            Loading timeline...
          </div>
        ) : isError ? (
          <div className="py-8 text-center text-rose-600">
            Failed to load tasks.
          </div>
        ) : groups.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            No tasks to show on the timeline yet.
          </div>
        ) : (
          <GanttChart
            tasks={groups}
            maxHeight={700}
            showProgress
            editMode={false}
            showCurrentDateMarker
            todayLabel="Today"
            // -------------------------------------------------------------
            // Day-only view, no Day/Week/Month selector, no title bar,
            // no sidebar — just the day header + the task rows.
            // -------------------------------------------------------------
            viewMode={ViewMode.DAY}
            viewModes={false}
            renderHeader={() => null}
            renderTaskList={() => null}
            // -------------------------------------------------------------
            // Task colors
            // -------------------------------------------------------------

            getTaskColor={({ task }) => {
              const t = task as GanttCustomTask;

              return resolveColor(t.status, t.percent ?? 0);
            }}
            // -------------------------------------------------------------
            // Custom task renderer
            // -------------------------------------------------------------

            renderTask={({ task, isHovered }) => {
              const t = task as GanttCustomTask;

              const color = resolveColor(t.status, t.percent ?? 0);

              // For in-progress tasks, create a gradient effect
              const taskStyle: CSSProperties = {
                width: "100%",
                height: "var(--rmg-task-height, 85px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 6,
                padding: "0 6px 0 14px",
                borderRadius: "7px",
                fontSize: 13,
                fontWeight: 600,
                whiteSpace: "nowrap",
                cursor: "pointer",
                boxShadow: isHovered
                  ? "0 2px 6px rgba(15, 23, 42, 0.12)"
                  : "none",
                transition: "box-shadow 0.15s ease",
              };

              if (t.status === "in-progress") {
                const passed = solidColorForProgress(IN_PROGRESS_HUE, t.percent ?? 0);
                const upcoming = pastelColorForProgress(IN_PROGRESS_HUE, 0);

                taskStyle.background = `linear-gradient(to right, ${passed.backgroundColor} 0%, ${passed.backgroundColor} ${t.percent ?? 0}%, ${upcoming.backgroundColor} ${t.percent ?? 0}%, ${upcoming.backgroundColor} 100%)`;
                taskStyle.color = passed.textColor;
              } else {
                taskStyle.backgroundColor = color.backgroundColor;
                taskStyle.color = color.textColor;
              }

              const members = t.raw.assigned_members ?? [];

              return (
                <div style={taskStyle}>
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      minWidth: 0,
                    }}
                  >
                    {t.name}
                  </span>

                  <AvatarStack
                    members={members}
                    ringColor={t.status === "in-progress"
                      ? solidColorForProgress(IN_PROGRESS_HUE, t.percent ?? 0).backgroundColor
                      : color.backgroundColor}
                  />
                </div>
              );
            }}
            // -------------------------------------------------------------
            // Task click
            // -------------------------------------------------------------

            onTaskClick={(task) => {
              handleTaskClick((task as GanttCustomTask).raw);
            }}
          />
        )}
      </div>

      {/* View Task Dialog */}
      <ViewTaskDialog
        task={selectedTask}
        open={viewDialogOpen}
        onOpenChange={handleViewDialogChange}
      />
    </div>
  );
}

export default TaskGanttView;