import { useMemo, useState } from "react";
import GanttChart, {
  type Task as GanttTask,
  type TaskGroup,
} from "react-modern-gantt";
import "react-modern-gantt/dist/index.css";

import { Card, CardContent } from "@/components/ui/card";
import { ViewTaskDialog } from "@/components/user/ViewTaskDialog";

import type { TaskResponseMembers, TaskStatus } from "@/types/task";

// -------------------------------------------------------------------------
// Color logic
//
// Fixed, unambiguous color per status (no more per-task hash colors —
// those made two tasks in the SAME status render in different colors,
// which read as "wrong"/inconsistent):
//
// - not_started : neutral gray  (nothing has happened yet)
// - in-progress : blue, intensifying (lighter -> darker) as progress
//                 (time elapsed toward the deadline) increases
// - submitted   : fixed yellow
// - completed   : fixed green
// -------------------------------------------------------------------------

const NOT_STARTED_COLOR = { backgroundColor: "#e2e8f0", textColor: "#334155" };
const SUBMITTED_COLOR = { backgroundColor: "#eab308", textColor: "#ffffff" };
const COMPLETED_COLOR = { backgroundColor: "#22c55e", textColor: "#ffffff" };

const IN_PROGRESS_HUE = 217; // blue

function solidColorForProgress(hue: number, progress: number) {
  const clamped = Math.min(100, Math.max(0, progress));
  const saturation = 55 + (clamped / 100) * 25; // 55% -> 80%
  const lightness = 70 - (clamped / 100) * 28; // 70% -> ~42%
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

/** Parse a date string, falling back to `fallback` if it's missing/invalid. */
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
 * Bad/overdue data (e.g. a deadline in the past on a not-started task, or a
 * completed_at before started_at) can otherwise produce endDate < startDate,
 * which renders as a negative-width or glitched bar. Guarantee endDate is
 * never before startDate.
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
      return { startDate, endDate, percent: 0 };
    }

    case "in-progress": {
      const start = safeDate(task.started_at ?? task.created_at, now);
      const end = deadline ?? addDays(start, 7);
      const [startDate, endDate] = clampRange(start, end);

      const total = endDate.getTime() - startDate.getTime();
      const elapsed = Date.now() - startDate.getTime();
      const percent =
        total > 0 ? Math.min(99, Math.max(1, (elapsed / total) * 100)) : 1;

      return { startDate, endDate, percent };
    }

    case "submitted": {
      const start = safeDate(task.started_at ?? task.created_at, now);
      const end = task.completed_at
        ? safeDate(task.completed_at, addDays(start, 1))
        : (deadline ?? addDays(start, 1));
      const [startDate, endDate] = clampRange(start, end);
      return { startDate, endDate, percent: 90 };
    }

    case "completed": {
      const start = safeDate(task.started_at ?? task.created_at, now);
      const end = task.completed_at
        ? safeDate(task.completed_at, start)
        : start;
      const [startDate, endDate] = clampRange(start, end);
      return { startDate, endDate, percent: 100 };
    }
  }
}

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

interface GanttCustomTask extends GanttTask {
  status: TaskStatus;
  raw: TaskResponseMembers;
}

interface TaskGanttViewProps {
  tasks: TaskResponseMembers[];
  /** Optional lookup so supertask ids render as real titles instead of raw ids. */
  supertaskNames?: Record<string, string>;
  /** Optional override — if omitted, clicking a task opens ViewTaskDialog internally, same as TaskTable. */
  onTaskClick?: (task: TaskResponseMembers) => void;
  isLoading?: boolean;
  isError?: boolean;
}

const UNGROUPED_KEY = "ungrouped";

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
        const ganttTasks: GanttCustomTask[] = groupTasks.map((task) => {
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
        });

        const label =
          supertaskId === UNGROUPED_KEY
            ? "Ungrouped Tasks"
            : (supertaskNames?.[supertaskId] ?? supertaskId);

        return {
          id: supertaskId,
          name: label,
          tasks: ganttTasks,
        };
      },
    );
  }, [tasks, supertaskNames]);

  return (
    <div className="mt-6 space-y-3">
      {/*
        react-modern-gantt positions its sticky header row and task-name
        sidebar with `position: fixed` internally. `overflow-hidden` alone
        does NOT clip fixed-position descendants — only absolute/sticky
        ones — so without a containing block those elements escape the
        rounded card and float above it.

        Applying `transform`/`contain` here makes this Card the CSS
        "containing block" for any fixed-position descendants, which
        forces the chart's header/sidebar to be clipped and positioned
        relative to THIS box instead of the viewport.
      */}
      <Card
        className="relative overflow-hidden rounded-lg p-0"
        style={{ transform: "translateZ(0)", contain: "paint" }}
      >
        <CardContent className="p-0">
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
              getTaskColor={({ task }) => {
                const t = task as GanttCustomTask;
                return resolveColor(t.status, t.percent ?? 0);
              }}
              onTaskClick={(task, group) => {
                void group;
                handleTaskClick((task as GanttCustomTask).raw);
              }}
            />
          )}
        </CardContent>
      </Card>

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
