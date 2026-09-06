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
// - not_started : pastel/light version of a per-task hue, hue is picked
//                 (deterministically, via a hash of the task id) from an
//                 arc that runs blue-violet -> violet -> magenta -> red ->
//                 orange (260deg..390deg, wrapping). Yellow/green are
//                 deliberately excluded from this arc since those are
//                 reserved for submitted/completed below.
// - in-progress : same per-task hue as its not_started state would have
//                 had, but "solid" — saturation/lightness intensify as
//                 progress (time elapsed toward the deadline) increases.
// - submitted   : fixed yellow
// - completed   : fixed green
// -------------------------------------------------------------------------

const SUBMITTED_COLOR = { backgroundColor: "#eab308", textColor: "#ffffff" };
const COMPLETED_COLOR = { backgroundColor: "#22c55e", textColor: "#ffffff" };

const HUE_ARC_START = 260; // blue-violet
const HUE_ARC_SPAN = 130; // wraps through violet/magenta/red into orange, stops before yellow/green

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** Stable per-task hue (0-360) picked from the red-orange..blue-violet arc. */
function taskHue(taskId: string): number {
  const hue = HUE_ARC_START + (hashString(taskId) % HUE_ARC_SPAN);
  return hue % 360;
}

function pastelColor(hue: number) {
  return {
    backgroundColor: `hsl(${hue}, 45%, 87%)`,
    textColor: "#1f2937", // light bg, dark text
  };
}

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

function resolveColor(
  task: TaskResponseMembers,
  status: TaskStatus,
  percent: number,
) {
  if (status === "submitted") return SUBMITTED_COLOR;
  if (status === "completed") return COMPLETED_COLOR;

  const hue = taskHue(task.id);
  return status === "not_started"
    ? pastelColor(hue)
    : solidColorForProgress(hue, percent);
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
      <Card className="overflow-hidden p-0">
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
                return resolveColor(t.raw, t.status, t.percent ?? 0);
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
