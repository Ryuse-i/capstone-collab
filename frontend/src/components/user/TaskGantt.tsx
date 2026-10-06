import { useMemo, useState, type CSSProperties } from "react";
import GanttChart, {
  ViewMode,
  type Task as GanttTask,
  type TaskGroup,
} from "react-modern-gantt";
import "react-modern-gantt/dist/index.css";

import type { TaskResponseMembers, TaskStatus } from "@/types/task";
import type { UserBase } from "@/types/user";
import * as ProjectMemberTypes from "@/types/project_member";
import EditTaskDialog from "@/components/user/EditTaskDialog";

// -------------------------------------------------------------------------
// Color logic
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

const IN_PROGRESS_HUE = 217;
const MIN_GANTT_ROWS = 8;
const HORIZON_MONTHS = 3;

// Dummy raw object for placeholder tasks
const dummyRaw: TaskResponseMembers = {
  id: "",
  name: "",
  description: "",
  created_by: "",
  project_id: "",
  priority: "low",
  category: "document",
  deadline: "",
  complexity: undefined,
  complexity_points: undefined,
  total_time_spent: undefined,
  started_at: undefined,
  completed_at: undefined,
  status: "not_started",
  supertask_id: undefined,
  primary_skill: "Backend Development" as ProjectMemberTypes.Skill,
  secondary_skills: [],
  assigned_members: [],
  created_at: "",
  updated_at: "",
};

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

  const saturation = 30 + (clamped / 100) * 15;
  const lightness = 80 + (clamped / 100) * 10;

  return {
    backgroundColor: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
    textColor: lightness > 60 ? "#1f2937" : "#ffffff",
  };
}

// -------------------------------------------------------------------------
// Date + progress resolution per status
// -------------------------------------------------------------------------

function normalizeStatus(raw: unknown): TaskStatus {
  if (typeof raw !== "string") return "not_started";

  const key = raw.trim().toLowerCase().replace(/[_\s]+/g, "-");

  switch (key) {
    case "not-started":
      return "not_started";

    case "in-progress":
      return "in_progress";

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

function addMonths(date: Date, months: number): Date {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() + months);
  return copy;
}

function safeDate(
  value: string | null | undefined,
  fallback: Date,
): Date {
  if (!value) return fallback;

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

interface Resolved {
  startDate: Date;
  endDate: Date;
  percent: number;
}

function clampRange(
  startDate: Date,
  endDate: Date,
): [Date, Date] {
  return endDate < startDate
    ? [startDate, startDate]
    : [startDate, endDate];
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

    case "in_progress": {
      const start = safeDate(
        task.started_at ?? task.created_at,
        now,
      );

      const end = deadline ?? addDays(start, 7);

      const [startDate, endDate] = clampRange(start, end);

      const total =
        endDate.getTime() - startDate.getTime();

      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);

      const elapsed = Math.max(
        0,
        startOfToday.getTime() - startDate.getTime(),
      );

      const percent =
        total > 0
          ? Math.min(
              99,
              Math.max(1, (elapsed / total) * 100),
            )
          : 1;

      return {
        startDate,
        endDate,
        percent,
      };
    }

    case "submitted": {
      const start = safeDate(
        task.started_at ?? task.created_at,
        now,
      );

      const end = task.completed_at
        ? safeDate(
            task.completed_at,
            addDays(start, 1),
          )
        : (deadline ?? addDays(start, 1));

      const [startDate, endDate] = clampRange(
        start,
        end,
      );

      return {
        startDate,
        endDate,
        percent: 90,
      };
    }

    case "completed": {
      const start = safeDate(
        task.started_at ?? task.created_at,
        now,
      );

      const end = task.completed_at
        ? safeDate(task.completed_at, start)
        : start;

      const [startDate, endDate] = clampRange(
        start,
        end,
      );

      return {
        startDate,
        endDate,
        percent: 100,
      };
    }

    default: {
      const start = safeDate(
        task.started_at ?? task.created_at,
        now,
      );

      const end = deadline ?? addDays(start, 7);

      const [startDate, endDate] = clampRange(
        start,
        end,
      );

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

function resolveColor(
  status: TaskStatus,
  percent: number,
) {
  switch (status) {
    case "submitted":
      return SUBMITTED_COLOR;

    case "completed":
      return COMPLETED_COLOR;

    case "in_progress":
      return solidColorForProgress(
        IN_PROGRESS_HUE,
        percent,
      );

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
    hash =
      (hash * 31 + id.charCodeAt(i)) >>> 0;
  }

  return AVATAR_PALETTE[
    hash % AVATAR_PALETTE.length
  ];
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

  const visible = members.slice(
    0,
    MAX_VISIBLE_AVATARS,
  );

  const overflow =
    members.length - visible.length;

  const bubbleStyle = (
    bg: string,
    marginLeft: number,
  ): CSSProperties => ({
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
          style={bubbleStyle(
            avatarColorFor(member.id),
            i === 0 ? 0 : -8,
          )}
        >
          {initials(member)}
        </div>
      ))}

      {overflow > 0 && (
        <div style={bubbleStyle("#334155", -8)}>
          +{overflow}
        </div>
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
   * @deprecated No longer rendered.
   */
  supertaskNames?: Record<string, string>;

  onTaskClick?: (
    task: TaskResponseMembers,
  ) => void;

  isLoading?: boolean;
  isError?: boolean;
}

// -------------------------------------------------------------------------
// Gantt styling
// -------------------------------------------------------------------------
//
// IMPORTANT:
// These CSS variables use the application's theme variables.
// Therefore the Gantt automatically changes when the
// application switches between light and dark mode.
// -------------------------------------------------------------------------

const GANTT_CSS_VARS: CSSProperties = {
  // Light mode:
  // --background will normally be white.
  //
  // Dark mode:
  // --background will normally become a dark color.
  ["--rmg-bg-color" as string]:
    "hsl(var(--background))",

  ["--rmg-text-color" as string]:
    "hsl(var(--foreground))",

  ["--rmg-border-color" as string]:
    "hsl(var(--border))",

  ["--rmg-row-height" as string]: "80px",

  ["--rmg-task-height" as string]: "60px",

  ["--rmg-border-radius" as string]: "6px",

  ["--rmg-marker-color" as string]:
    "var(--maroon)",

  ["--rmg-today-marker-left" as string]: "0%",
};

// -------------------------------------------------------------------------
// Component
// -------------------------------------------------------------------------

export function TaskGanttView({
  tasks,
  onTaskClick,
  isLoading = false,
  isError = false,
}: TaskGanttViewProps) {
  const [
    selectedTaskId,
    setSelectedTaskId,
  ] = useState<
    TaskResponseMembers["id"] | null
  >(null);

  const selectedTask = useMemo(
    () =>
      tasks.find(
        (t) => t.id === selectedTaskId,
      ) ?? null,
    [tasks, selectedTaskId],
  );

  const [
    viewDialogOpen,
    setViewDialogOpen,
  ] = useState(false);

  // -----------------------------------------------------------------------
  // Task click
  // -----------------------------------------------------------------------

  const handleTaskClick = (
    task: TaskResponseMembers,
  ) => {
    if (onTaskClick) {
      onTaskClick(task);
      return;
    }

    setSelectedTaskId(task.id);
    setViewDialogOpen(true);
  };

  const handleViewDialogChange = (
    open: boolean,
  ) => {
    setViewDialogOpen(open);
  };

  // -----------------------------------------------------------------------
  // Build one flat task group
  // -----------------------------------------------------------------------

  const realGroups = useMemo<TaskGroup[]>(() => {
    if (tasks.length === 0) {
      return [];
    }

    return tasks
      .map((task) => {
        const status: TaskStatus =
          normalizeStatus(task.status);

        const {
          startDate,
          endDate,
          percent,
        } = resolveTask(task);

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
          id: task.id,
          name: task.name,
          tasks: [ganttTask],
        };
      })
      .sort(
        (a, b) =>
          a.tasks[0].startDate.getTime() -
          b.tasks[0].startDate.getTime(),
      );
  }, [tasks]);

  // -----------------------------------------------------------------------
  // Placeholder rows
  // -----------------------------------------------------------------------

  const groups = useMemo<TaskGroup[]>(() => {
    const startOfToday = new Date();

    startOfToday.setHours(0, 0, 0, 0);

    const horizonEnd = addMonths(
      startOfToday,
      HORIZON_MONTHS,
    );

    const placeholderCount = Math.max(
      MIN_GANTT_ROWS - realGroups.length,
      1,
    );

    const placeholders: TaskGroup[] = [];

    for (
      let i = 0;
      i < placeholderCount;
      i++
    ) {
      const isAnchor = i === 0;

      placeholders.push({
        id: `placeholder-${i}`,
        name: "",
        tasks: [
          {
            id: `placeholder-task-${i}`,
            name: "",
            startDate: startOfToday,
            endDate: isAnchor
              ? horizonEnd
              : startOfToday,
            percent: 0,
            status: "not_started",
            raw: dummyRaw,
          } as GanttCustomTask,
        ],
      });
    }

    return [
      ...realGroups,
      ...placeholders,
    ];
  }, [realGroups]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="mt-6">
      <div
        className="
          relative
          overflow-visible
          bg-background
          text-foreground
          transition-colors
          duration-200
        "
        style={{
          transform: "translateZ(0)",
          contain: "layout",

          // Theme-aware Gantt variables
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

            // Day-only view
            viewMode={ViewMode.DAY}
            viewModes={false}
            renderHeader={() => null}
            renderTaskList={() => null}

            // -------------------------------------------------------------
            // Task colors
            // -------------------------------------------------------------

            getTaskColor={({ task }) => {
              const t =
                task as GanttCustomTask;

              // Placeholder / anchor rows
              // are completely invisible.
              if (t.name === "") {
                return {
                  backgroundColor:
                    "transparent",
                  textColor: "transparent",
                };
              }

              return resolveColor(
                t.status,
                t.percent ?? 0,
              );
            }}

            // -------------------------------------------------------------
            // Custom task renderer
            // -------------------------------------------------------------

            renderTask={({
              task,
              isHovered,
            }) => {
              const t =
                task as GanttCustomTask;

              const color = resolveColor(
                t.status,
                t.percent ?? 0,
              );

              const taskStyle: CSSProperties = {
                width: "100%",
                height:
                  "var(--rmg-task-height, 85px)",
                display: "flex",
                alignItems: "center",
                justifyContent:
                  "space-between",
                gap: 6,
                padding:
                  "0 6px 0 14px",
                borderRadius: "7px",
                fontSize: 13,
                fontWeight: 600,
                whiteSpace: "nowrap",
                cursor: "pointer",

                boxShadow: isHovered
                  ? "0 2px 6px rgba(15, 23, 42, 0.12)"
                  : "none",

                transition:
                  "box-shadow 0.15s ease",
              };

              // -----------------------------------------------------------
              // Placeholder
              // -----------------------------------------------------------

              if (t.name === "") {
                taskStyle.backgroundColor =
                  "transparent";

                taskStyle.pointerEvents =
                  "none";

                taskStyle.boxShadow = "none";
              }

              // -----------------------------------------------------------
              // In progress
              // -----------------------------------------------------------

              else if (
                t.status === "in_progress"
              ) {
                const passed =
                  solidColorForProgress(
                    IN_PROGRESS_HUE,
                    t.percent ?? 0,
                  );

                const upcoming =
                  pastelColorForProgress(
                    IN_PROGRESS_HUE,
                    0,
                  );

                taskStyle.background =
                  `linear-gradient(
                    to right,
                    ${passed.backgroundColor} 0%,
                    ${passed.backgroundColor} ${t.percent ?? 0}%,
                    ${upcoming.backgroundColor} ${t.percent ?? 0}%,
                    ${upcoming.backgroundColor} 100%
                  )`;

                taskStyle.color =
                  passed.textColor;
              }

              // -----------------------------------------------------------
              // Other statuses
              // -----------------------------------------------------------

              else {
                taskStyle.backgroundColor =
                  color.backgroundColor;

                taskStyle.color =
                  color.textColor;
              }

              const members =
                t.raw.assigned_members ?? [];

              return (
                <div style={taskStyle}>
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow:
                        "ellipsis",
                      minWidth: 0,
                    }}
                  >
                    {t.name}
                  </span>

                  <AvatarStack
                    members={members}
                    ringColor={
                      t.status ===
                      "in_progress"
                        ? solidColorForProgress(
                            IN_PROGRESS_HUE,
                            t.percent ?? 0,
                          ).backgroundColor
                        : color.backgroundColor
                    }
                  />
                </div>
              );
            }}

            // -------------------------------------------------------------
            // Task click
            // -------------------------------------------------------------

            onTaskClick={(task) => {
              const t =
                task as GanttCustomTask;

              if (!t.raw?.id) {
                return;
              }

              handleTaskClick(t.raw);
            }}
          />
        )}
      </div>

      {/* Outside the translateZ(0) wrapper so
          the drawer's fixed positioning isn't affected. */}
      {selectedTask && (
        <EditTaskDialog
          task={selectedTask}
          projectId={
            selectedTask.project_id
          }
          open={viewDialogOpen}
          onOpenChange={
            handleViewDialogChange
          }
        />
      )}
    </div>
  );
}

export default TaskGanttView;