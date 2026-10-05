import { useState } from "react";
import AppLayout from "@/layouts/Applayout";
import {
  AlertTriangle,
  CheckSquare,
  Clock,
  XSquare,
  BarChart2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetAllTaskAssignedMembers } from "@/hooks/useTask";
import { useCurrentUser } from "@/hooks/useAuth";
import { useGetCurrentProject } from "@/hooks/useProject";
import { useGetOneProjectWithSpanshot } from "@/hooks/useProject";
import { TaskTable } from "@/components/user/TaskTable";
import { TaskGanttView } from "@/components/user/TaskGantt";
import { TaskBoard } from "@/components/user/TaskBoard";

type BoardTask = {
  id: string;
  title: string;
  description: string;
};



const viewTabs = [
  { id: "table", label: "Table" },
  { id: "timeline", label: "Timeline" },
  { id: "board", label: "Board" },
] as const;

type ViewMode = (typeof viewTabs)[number]["id"];


// ---------------------------------------------------------------------------
// Loading Skeleton
// ---------------------------------------------------------------------------

function ProjectTaskSkeleton() {
  return (
    <div className="min-w-0 w-full">
      {/* Mirrors page heading */}
      <Skeleton className="my-2 h-8 w-72" />

      {/* ── Stat Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <Card key={item}>
            <CardContent className="flex flex-col gap-2 p-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-6 rounded-md" />
                <Skeleton className="h-4 w-12" />
              </div>

              <Skeleton className="h-9 w-14" />

              <Skeleton className="h-3 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── View Switcher ────────────────────────────────────────── */}
      <div className="mt-6">
        <Skeleton className="h-10 w-40 rounded-md" />
      </div>

      {/* ── Task Table Skeleton ──────────────────────────────────── */}
      <Card className="mt-4 overflow-hidden">
        <CardContent className="p-0">
          {/* Table header */}
          <div className="flex items-center gap-4 border-b px-4 py-3">
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="ml-auto h-4 w-16" />
          </div>

          {/* Table rows */}
          <div className="divide-y">
            {[1, 2, 3, 4, 5, 6, 7].map((item) => (
              <div
                key={item}
                className="flex min-h-14 items-center gap-4 px-4 py-3"
              >
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="ml-auto h-4 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Task() {
  const [viewMode, setViewMode] = useState<ViewMode>("table");

    useState<BoardTask | null>(null);


  // Fetch user data
  const userQuery = useCurrentUser();
  const {
    data: userData,
    isLoading: isUserLoading,
    isError: isUserError,
  } = userQuery;

  // Fetch current project (depends on user)
  const currentProjectQuery = useGetCurrentProject(userData?.id ?? "");
  const {
    data: currentProjectData,
    isLoading: isProjectLoading,
    isError: isProjectError,
  } = currentProjectQuery;

  const projectId = currentProjectData?.id ?? "";

  // Fetch tasks (depends on projectId)
  const tasksQuery = useGetAllTaskAssignedMembers(projectId);
  const {
    data: allProjectTasks,
    isLoading: isTasksLoading,
    isError: isTasksError,
  } = tasksQuery;

  // Fetch project snapshot (depends on projectId)
  const projectQuery = useGetOneProjectWithSpanshot(projectId);
  const {
    data: projectData,
    isLoading: isSnapshotLoading,
    isError: isSnapshotError,
  } = projectQuery;

  // Combined loading state
  const isLoading =
    isUserLoading || isProjectLoading || isTasksLoading || isSnapshotLoading;

  // Combined error state
  const isError =
    isUserError || isProjectError || isTasksError || isSnapshotError;

  const now = new Date();
  const snapshot = projectData?.snapshot;

  // counts all overdue task
  const overdueTaskCounter = (allProjectTasks ?? []).filter((task) => {
    if (task.status === "completed") return false;
    if (!task.deadline) return false;

    return new Date(task.deadline) < now;
  }).length;

  const stats = [
    {
      icon: <CheckSquare className="h-6 w-6 text-green-500" />,
      change: "+3%",
      value: (allProjectTasks ?? []).filter(
        (task) => task.status === "completed",
      ).length,
      label: "TASKS COMPLETED",
    },
    {
      icon: <Clock className="h-6 w-6 text-yellow-500" />,
      change: "+22%",
      value: (allProjectTasks ?? []).filter(
        (task) => task.status === "in_progress",
      ).length,
      label: "IN PROGRESS",
    },
    {
      icon: <XSquare className="h-6 w-6 text-red-500" />,
      change: "+28%",
      value: overdueTaskCounter,
      label: "OVERDUE",
      valueColor: "text-red-500",
    },
    {
      icon: <BarChart2 className="h-6 w-6 text-purple-400" />,
      change: "+36%",
      value: (allProjectTasks ?? []).filter(
        (task) => task.status === "not_started",
      ).length,
      label: "Not Started",
    },
  ];

  return (
    <AppLayout
      breadcrumbs={[
        {
          label: "Project Task",
          href: "/project-task",
        },
      ]}
    >
      {isError ? (
        <div className="flex h-screen flex-col items-center justify-center gap-4">
          <AlertTriangle className="h-8 w-8 text-destructive" />

          <p className="text-foreground dark:text-muted-foreground">
            Failed to load project data. Please try again later.
          </p>
        </div>
      ) : isLoading ? (
        <ProjectTaskSkeleton />
      ) : (
        <div className="min-w-0 w-full">
          <h1 className="my-2 text-2xl font-bold text-foreground">
            Distribute and manage tasks
          </h1>

          {/* Stat cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat, index) => (
              <Card key={index}>
                <CardContent className="flex flex-col gap-2 p-4">
                  <div className="flex items-center justify-between">
                    {stat.icon}

                    <span className="text-xs font-medium text-green-500">
                      {stat.change} ↑
                    </span>
                  </div>

                  <p
                    className={`text-3xl font-bold ${
                      stat.valueColor ?? "text-foreground dark:text-gray-100"
                    }`}
                  >
                    {stat.value}
                  </p>

                  <p className="text-xs font-medium text-muted-foreground">
                    {stat.label}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Unassigned task warning */}
          {typeof snapshot?.unassigned_tasks === "number" &&
            snapshot.unassigned_tasks > 0 && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 shrink-0" />

                <span>
                  {snapshot.unassigned_tasks} task
                  {snapshot.unassigned_tasks > 1 ? "s" : ""} unassigned
                  {" — "}
                  assign {snapshot.unassigned_tasks > 1 ? "them" : "it"} to keep
                  workload balance accurate.
                </span>
              </div>
            )}

          {/* View switcher */}
          <div className="mt-6">
            <Select
              value={viewMode}
              onValueChange={(value) => setViewMode(value as ViewMode)}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select view" />
              </SelectTrigger>

              <SelectContent>
                {viewTabs.map((tab) => (
                  <SelectItem key={tab.id} value={tab.id}>
                    {tab.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table / Board */}
          {viewMode === "table" ? (
            <TaskTable
              tasks={allProjectTasks ?? []}
              projectId={projectId}
              isLoading={isTasksLoading}
              isError={isTasksError}
            />
          ) : viewMode === "timeline" ? (
            <TaskGanttView
              tasks={allProjectTasks ?? []}
              isLoading={isTasksLoading}
              isError={isTasksError}
            />
          ) : (
            <TaskBoard tasks={allProjectTasks ?? []} projectId={projectId} />
          )}
        </div>
      )}

    </AppLayout>
  );
}