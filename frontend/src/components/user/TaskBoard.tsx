import { useMemo, useState } from "react";
import { format } from "date-fns";
import { AlertTriangle, CalendarIcon, Eye, Info } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetAllProjectSupertasks } from "@/hooks/useSupertask";
// Adjust this path to wherever EditTaskDialog lives in your project.
import EditTaskDialog from "@/components/user/EditTaskDialog";
import type { SupertaskResponse } from "@/types/supertask";
import type { TaskResponseMembers, TaskStatus } from "@/types/task";

const UNASSIGNED_ID = "__unassigned__";

const STATUS_LABEL: Record<TaskStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  submitted: "Submitted",
  completed: "Completed",
};

const STATUS_STYLE: Record<TaskStatus, string> = {
  completed: "bg-green-100 text-green-700",
  submitted: "bg-blue-100 text-blue-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  not_started: "bg-gray-100 text-gray-500",
};

type BoardColumn = {
  id: string;
  title: string;
  supertask: SupertaskResponse | null; // null = the "No supertask" box
  tasks: TaskResponseMembers[];
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : format(date, "PPP");
}

// ---------------------------------------------------------------------------
// Supertask details dialog
// ---------------------------------------------------------------------------

function SupertaskDialog({
  column,
  onClose,
}: {
  column: BoardColumn | null;
  onClose: () => void;
}) {
  const supertask = column?.supertask ?? null;
  const tasks = column?.tasks ?? [];
  const completed = tasks.filter((task) => task.status === "completed").length;

  return (
    <Dialog open={!!column} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-xl sm:max-w-125">
        <DialogHeader>
          <DialogTitle>{column?.title ?? "Supertask"}</DialogTitle>

          <DialogDescription>
            {supertask
              ? "A larger piece of the project, broken into the tasks below."
              : "Tasks that haven't been placed under a supertask yet."}
          </DialogDescription>
        </DialogHeader>

        {column && (
          <div className="space-y-4">
            {supertask && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Description
                </p>

                <p className="text-sm leading-relaxed text-foreground">
                  {supertask.description?.trim() || "No description yet."}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Progress
                </p>
                <p className="text-foreground">
                  {completed} of {tasks.length} task
                  {tasks.length === 1 ? "" : "s"} completed
                </p>
              </div>

              {supertask && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Created
                  </p>
                  <p className="text-foreground">
                    {formatDate(supertask.created_at)}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Tasks
              </p>

              {tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No tasks in this supertask yet.
                </p>
              ) : (
                <ul className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
                  {tasks.map((task) => (
                    <li
                      key={task.id}
                      className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-sm"
                    >
                      <span className="truncate text-foreground">
                        {task.name}
                      </span>

                      <Badge
                        variant="secondary"
                        className={`shrink-0 border-0 capitalize ${STATUS_STYLE[task.status ?? "not_started"]}`}
                      >
                        {STATUS_LABEL[task.status ?? "not_started"]}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" className="min-w-24">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

function ColumnHeader({
  column,
  onInfo,
}: {
  column: BoardColumn;
  onInfo: () => void;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h3 className="min-w-0 truncate font-semibold text-foreground">
        {column.title}
      </h3>

      <div className="flex shrink-0 items-center gap-1">
        <Badge variant="default">{column.tasks.length}</Badge>

        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={onInfo}
          aria-label={`View details of ${column.title}`}
        >
          <Info className="h-4 w-4 text-primary" />
        </Button>
      </div>
    </div>
  );
}

function TaskCard({
  task,
  projectId,
}: {
  task: TaskResponseMembers;
  projectId: string;
}) {
  return (
    <div className="rounded-lg border bg-background p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate font-medium text-foreground">
          {task.name}
        </p>

        {/* Opens the full view / edit drawer for this task */}
        <EditTaskDialog
          task={task}
          projectId={projectId}
          trigger={
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 shrink-0 p-0"
              aria-label={`View ${task.name}`}
            >
              <Eye className="h-4 w-4 text-primary" />
            </Button>
          }
        />
      </div>

      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
        {task.description}
      </p>

      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <Badge
          variant="secondary"
          className={`border-0 capitalize ${STATUS_STYLE[task.status ?? "not_started"]}`}
        >
          {STATUS_LABEL[task.status ?? "not_started"]}
        </Badge>

        {task.deadline && (
          <span className="flex items-center gap-1">
            <CalendarIcon className="h-3 w-3" />
            {formatDate(task.deadline)}
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Board
// ---------------------------------------------------------------------------

export interface TaskBoardProps {
  tasks: TaskResponseMembers[];
  projectId: string;
}

export function TaskBoard({ tasks, projectId }: TaskBoardProps) {
  const [openColumn, setOpenColumn] = useState<BoardColumn | null>(null);

  const {
    data: supertasks = [],
    isLoading,
    isError,
  } = useGetAllProjectSupertasks(projectId);

  const { supertaskColumns, unassignedColumn } = useMemo(() => {
    const knownIds = new Set(supertasks.map((s) => String(s.id)));
    const byId = new Map<string, TaskResponseMembers[]>();
    const orphaned: TaskResponseMembers[] = [];

    for (const task of tasks) {
      const key = task.supertask_id ? String(task.supertask_id) : null;

      // No supertask, or one that no longer exists -> unassigned section.
      if (!key || !knownIds.has(key)) {
        orphaned.push(task);
        continue;
      }

      byId.set(key, [...(byId.get(key) ?? []), task]);
    }

    const supertaskColumns: BoardColumn[] = supertasks.map((supertask) => ({
      id: String(supertask.id),
      title: supertask.name,
      supertask,
      tasks: byId.get(String(supertask.id)) ?? [],
    }));

    const unassignedColumn: BoardColumn | null =
      orphaned.length > 0
        ? {
            id: UNASSIGNED_ID,
            title: "No supertask",
            supertask: null,
            tasks: orphaned,
          }
        : null;

    return { supertaskColumns, unassignedColumn };
  }, [supertasks, tasks]);

  // Keep the open dialog in sync with refetched data.
  const liveOpenColumn = openColumn
    ? ([
        ...supertaskColumns,
        ...(unassignedColumn ? [unassignedColumn] : []),
      ].find((column) => column.id === openColumn.id) ?? null)
    : null;

  if (isLoading) {
    return (
      <div className="mt-4 flex gap-4 overflow-x-auto pb-2 no-scrollbar">
        {[1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-64 w-[85vw] shrink-0 sm:w-70" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        Couldn't load supertasks. Please try again later.
      </div>
    );
  }

  if (supertaskColumns.length === 0 && !unassignedColumn) {
    return (
      <p className="mt-4 text-sm text-muted-foreground">
        No supertasks or tasks yet. Create a supertask to start grouping tasks.
      </p>
    );
  }

  return (
    <>
      <div className="mt-4 space-y-6">
        {/* Row of supertask columns */}
        {supertaskColumns.length > 0 && (
          <div className="relative w-full min-w-0 overflow-x-auto pb-2 no-scrollbar">
            <div className="flex w-max gap-4">
              {supertaskColumns.map((column) => (
                <Card
                  key={column.id}
                  className="w-[85vw] shrink-0 border-dashed sm:w-70"
                >
                  <CardContent className="p-4">
                    <ColumnHeader
                      column={column}
                      onInfo={() => setOpenColumn(column)}
                    />

                    <div className="flex max-h-[55vh] flex-col gap-3 overflow-y-auto pr-1">
                      {column.tasks.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          No tasks yet.
                        </p>
                      )}

                      {column.tasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          projectId={projectId}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Tasks without a supertask, below the row */}
        {unassignedColumn && (
          <Card className="w-full border-dashed">
            <CardContent className="p-4">
              <ColumnHeader
                column={unassignedColumn}
                onInfo={() => setOpenColumn(unassignedColumn)}
              />

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {unassignedColumn.tasks.map((task) => (
                  <TaskCard key={task.id} task={task} projectId={projectId} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <SupertaskDialog
        column={liveOpenColumn}
        onClose={() => setOpenColumn(null)}
      />
    </>
  );
}

export default TaskBoard;