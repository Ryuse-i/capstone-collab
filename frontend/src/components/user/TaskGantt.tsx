import { useMemo, useState, type CSSProperties } from "react";
import GanttChart, {
  type Task as GanttTask,
  type TaskGroup,
  ViewMode,
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
    width: 28,
    height: 28,
    marginLeft,
    borderRadius: "9999px",
    border: `2px solid ${ringColor}`,
    backgroundColor: bg,
    color: "#ffffff",
    fontSize: 11,
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
        marginLeft: 10,
        flexShrink: 0,
      }}
    >
      {visible.map((member, i) => (
        <div
          key={member.id}
          title={`${member.first_name} ${member.last_name}`}
          style={bubbleStyle(avatarColorFor(member.id), i === 0 ? 0 : -10)}
        >
          {initials(member)}
        </div>
      ))}

      {overflow > 0 && (
        <div style={bubbleStyle("#334155", -10)}>+{overflow}</div>
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

  /**
   * Overall size of the whole Gantt chart container.
   * Accepts any valid CSS size (px, %, rem, vh, etc).
   * Defaults to full width and a capped height with internal scrolling.
   */
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
}

const UNGROUPED_KEY = "ungrouped";

// -------------------------------------------------------------------------
// Gantt sizing constants
//
// Bumped up across the board — taller rows, bigger bars, larger text —
// so the chart reads as a substantial, primary element on the page
// instead of a thin sliver with lots of empty space around it.
// -------------------------------------------------------------------------

const ROW_HEIGHT = 130;
const TASK_BAR_HEIGHT = 56;
const TASK_FONT_SIZE = 15;

// -------------------------------------------------------------------------
// Gantt styling
//
// Keep the chart itself flat and rectangular.
// Only the individual task bars receive subtle rounding.
//
// NOTE: react-modern-gantt applies --rmg-row-height and --rmg-task-height
// as an inline declaration directly on its own root element
// (`.rmg-gantt-chart`). A same-element declaration always wins over an
// inherited value from an ancestor, so setting these vars on a wrapper
// div (via GANTT_CSS_VARS below) has no effect on row/task sizing no
// matter how that wrapper is resized. They're forced via the scoped
// <style> override in the component render instead — see
// GANTT_SIZE_OVERRIDE_CSS.
// -------------------------------------------------------------------------

const GANTT_CSS_VARS: CSSProperties = {
  ["--rmg-bg-color" as string]: "#ffffff",

  ["--rmg-text-color" as string]: "#1e293b",

  ["--rmg-border-color" as string]: "#e5e7eb",

  // Bigger header/sidebar text to match the larger rows.
  ["--rmg-font-size" as string]: "15px",

  ["--rmg-header-font-size" as string]: "16px",

  // Subtle rounding instead of a full pill.
  ["--rmg-border-radius" as string]: "8px",

  ["--rmg-marker-color" as string]: "var(--primary)",

  ["--rmg-blue-500" as string]: "var(--primary)",
};

// Scoped override for the row/task height variables — see note above.
// Targets react-modern-gantt's own root class so it beats the library's
// same-element declaration. Kept in sync with ROW_HEIGHT / TASK_BAR_HEIGHT
// above so there's a single source of truth for these numbers.
const GANTT_SIZE_OVERRIDE_CSS = `
  .rmg-gantt-chart {
    --rmg-row-height: ${ROW_HEIGHT}px !important;
    --rmg-task-height: ${TASK_BAR_HEIGHT}px !important;
  }
`;

// -------------------------------------------------------------------------
// Component
// -------------------------------------------------------------------------

export function TaskGanttView({
  tasks,
  supertaskNames,
  onTaskClick,
  isLoading = false,
  isError = false,
  width = "100%",
  height = "1200px",
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
      {/* Scoped size override — see GANTT_SIZE_OVERRIDE_CSS above for why
          this can't be done via the GANTT_CSS_VARS inline style instead. */}
      <style>{GANTT_SIZE_OVERRIDE_CSS}</style>

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

          // -----------------------------------------------------------
          // Overall chart size.
          //
          // `width`/`height` bound the whole component; `overflowY`
          // lets the chart scroll internally instead of pushing the
          // rest of the page down when there are many task groups.
          // -----------------------------------------------------------
          width,
          height,
          overflowY: "auto",

          ...GANTT_CSS_VARS,
        }}
      >
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground text-base">
            Loading timeline...
          </div>
        ) : isError ? (
          <div className="py-8 text-center text-rose-600 text-base">
            Failed to load tasks.
          </div>
        ) : groups.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground text-base">
            No tasks to show on the timeline yet.
          </div>
        ) : (
          <GanttChart
            tasks={groups}
            viewModes={[ViewMode.DAY, ViewMode.WEEK, ViewMode.MONTH]}
            rowHeight={ROW_HEIGHT}
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

                    width: `${Math.max(widthPx, 48)}px`,

                    height: `${TASK_BAR_HEIGHT}px`,

                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",

                    gap: 8,

                    padding: "0 10px 0 18px",

                    // Subtle rounded corners.
                    // No more full pill shape.
                    borderRadius: "9px",

                    backgroundColor: color.backgroundColor,

                    color: color.textColor,

                    fontSize: `${TASK_FONT_SIZE}px`,

                    fontWeight: 600,

                    whiteSpace: "nowrap",

                    cursor: "pointer",

                    // Keep the default state flat.
                    // Only give a small elevation on hover.
                    boxShadow: isHovered
                      ? "0 3px 8px rgba(15, 23, 42, 0.15)"
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