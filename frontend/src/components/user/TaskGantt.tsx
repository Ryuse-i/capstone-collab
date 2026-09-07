import { useMemo, useState, type CSSProperties } from "react";
import GanttChart, {
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

// -------------------------------------------------------------------------
// Date + progress resolution per status
// -------------------------------------------------------------------------

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
  const status: TaskStatus = task.status ?? "not_started";

  const now = new Date();

  const deadline = task.deadline
    ? safeDate(task.deadline, addDays(now, 7))
    : null;

  switch (status) {
    case "not_started": {
      // Dynamic: "today" as long as nobody has picked it up yet.
      const start = now;
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

      const elapsed = Date.now() - startDate.getTime();

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

    case "in-progress":
      return solidColorForProgress(IN_PROGRESS_HUE, percent);

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

  /** Optional lookup so supertask ids render as real titles instead of raw ids. */
  supertaskNames?: Record<string, string>;

  /** Optional override for task click behavior. */
  onTaskClick?: (task: TaskResponseMembers) => void;

  isLoading?: boolean;
  isError?: boolean;
}

const UNGROUPED_KEY = "ungrouped";

// -------------------------------------------------------------------------
// Gantt styling
//
// Keep the chart itself flat and rectangular.
// Only the individual task bars receive subtle rounding.
// -------------------------------------------------------------------------

const GANTT_CSS_VARS: CSSProperties = {
  ["--rmg-bg-color" as string]: "#ffffff",

  ["--rmg-text-color" as string]: "#1e293b",

  ["--rmg-border-color" as string]: "#e5e7eb",

  ["--rmg-row-height" as string]: "60px",

  ["--rmg-task-height" as string]: "36px",

  // Subtle rounding instead of a full pill.
  ["--rmg-border-radius" as string]: "6px",

  ["--rmg-marker-color" as string]: "#2563eb",
};

// -------------------------------------------------------------------------
// Component
// -------------------------------------------------------------------------

export function TaskGanttView({
  tasks,
  supertaskNames,
  onTaskClick,
  isLoading = false,
  isError = false,
}: TaskGanttViewProps) {
  const [selectedTask, setSelectedTask] = useState<TaskResponseMembers | null>(
    null,
  );

  const [viewDialogOpen, setViewDialogOpen] = useState(false);

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
  // Group tasks
  // -----------------------------------------------------------------------

  const groups = useMemo<TaskGroup[]>(() => {
    const bySupertask = new Map<string, TaskResponseMembers[]>();

    for (const task of tasks) {
      const key = task.supertask_id ?? UNGROUPED_KEY;

      const bucket = bySupertask.get(key) ?? [];

      bucket.push(task);

      bySupertask.set(key, bucket);
    }

    return Array.from(bySupertask.entries()).map(
      ([supertaskId, groupTasks]) => {
        const ganttTasks: GanttCustomTask[] = groupTasks
          .map((task) => {
            const status: TaskStatus = task.status ?? "not_started";

            const { startDate, endDate, percent } = resolveTask(task);

            return {
              id: task.id,
              name: task.name,
              startDate,
              endDate,
              percent,
              status,
              raw: task,
            };
          })

          // Earliest-starting task first.
          .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

        const label =
          supertaskId === UNGROUPED_KEY
            ? "Ungrouped Tasks"
            : (supertaskNames?.[supertaskId] ?? supertaskId);

        return {
          id: supertaskId,

          name: `${label} (${groupTasks.length})`,

          tasks: ganttTasks,
        };
      },
    );
  }, [tasks, supertaskNames]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="mt-6">
      <div
        className="relative overflow-hidden"
        style={{
          /*
           * react-modern-gantt uses fixed-position elements internally.
           *
           * transform + contain creates a containing block so the
           * chart header/sidebar remain clipped inside this element.
           */
          transform: "translateZ(0)",
          contain: "paint",

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
            showProgress
            editMode={false}
            showCurrentDateMarker
            todayLabel="Today"
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

            renderTask={({ task, leftPx, widthPx, topPx, isHovered }) => {
              const t = task as GanttCustomTask;

              const color = resolveColor(t.status, t.percent ?? 0);

              const members = t.raw.assigned_members ?? [];

              return (
                <div
                  style={{
                    position: "absolute",

                    left: `${leftPx}px`,
                    top: `${topPx}px`,

                    width: `${Math.max(widthPx, 36)}px`,

                    height: "36px",

                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",

                    gap: 6,

                    padding: "0 6px 0 14px",

                    // Subtle rounded corners.
                    // No more full pill shape.
                    borderRadius: "7px",

                    backgroundColor: color.backgroundColor,

                    color: color.textColor,

                    fontSize: 13,

                    fontWeight: 600,

                    whiteSpace: "nowrap",

                    cursor: "pointer",

                    // Keep the default state flat.
                    // Only give a small elevation on hover.
                    boxShadow: isHovered
                      ? "0 2px 6px rgba(15, 23, 42, 0.12)"
                      : "none",

                    transition: "box-shadow 0.15s ease",
                  }}
                >
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
                    ringColor={color.backgroundColor}
                  />
                </div>
              );
            }}
            // -------------------------------------------------------------
            // Task click
            // -------------------------------------------------------------

            onTaskClick={(task, group) => {
              void group;

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
