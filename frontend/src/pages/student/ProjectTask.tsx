import { useState } from "react";
import AppLayout from "@/layouts/Applayout";
import {
  AlertTriangle,
  CheckSquare,
  Eye,
  Clock,
  XSquare,
  BarChart2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { ViewTaskDialog } from "@/components/user/ViewTaskDialog";
import type { TaskResponseMembers } from "@/types/task";

type BoardTask = {
  id: string;
  title: string;
  description: string;
};

type BoardSupertask = {
  id: string;
  title: string;
  tasks: BoardTask[];
};

const boardSupertasks: BoardSupertask[] = [
  {
    id: "supertask-auth",
    title: "User Authentication",
    tasks: [
      {
        id: "task-1",
        title: "Implement login flow",
        description: "Build the login form, validation, and session handling.",
      },
      {
        id: "task-2",
        title: "Implement signup flow",
        description: "Build the signup form and email verification.",
      },
    ],
  },
  {
    id: "supertask-dashboard",
    title: "Dashboard",
    tasks: [
      {
        id: "task-3",
        title: "Design dashboard wireframes",
        description: "Sketch out the layout and core widgets.",
      },
      {
        id: "task-4",
        title: "Build dashboard UI",
        description: "Implement the layout and interactions.",
      },
    ],
  },
  {
    id: "supertask-api",
    title: "API Layer",
    tasks: [
      {
        id: "task-5",
        title: "API endpoint testing",
        description: "Write integration tests for core endpoints.",
      },
    ],
  },
  {
    id: "supertask-infra",
    title: "Infrastructure",
    tasks: [
      {
        id: "task-6",
        title: "Deploy CI/CD pipeline",
        description: "Set up automated build and deploy on push.",
      },
      {
        id: "task-7",
        title: "Database migration script",
        description: "Write and test the migration for the new schema.",
      },
    ],
  },
];

const viewTabs = [
  { id: "table", label: "Table" },
  { id: "timeline", label: "Timeline" },
  { id: "board", label: "Board" },
] as const;

type ViewMode = (typeof viewTabs)[number]["id"];

function BoardCardDialog({
  open,
  onOpenChange,
  card,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: BoardTask | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-xl sm:max-w-125">
        <DialogHeader>
          <DialogTitle>{card?.title ?? "Task"}</DialogTitle>

          <DialogDescription>
            Board view card — mock data, not yet wired to the backend.
          </DialogDescription>
        </DialogHeader>

        {card && (
          <p className="text-sm text-foreground leading-relaxed">
            {card.description}
          </p>
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

export default function Task() {
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  const [selectedBoardCard, setSelectedBoardCard] = useState<BoardTask | null>(
    null,
  );
  const [selectedTimelineTask, setSelectedTimelineTask] =
    useState<TaskResponseMembers | null>(null);
  const [timelineDialogOpen, setTimelineDialogOpen] = useState(false);

  const [boardDialogOpen, setBoardDialogOpen] = useState(false);

  const { data: user } = useCurrentUser();

  const { data: currentProject } = useGetCurrentProject(user?.id ?? "");

  const projectId = currentProject?.id ?? "";

  const {
    data: allProjectTasks,
    isLoading: isTasksLoading,
    isError: isTasksError,
  } = useGetAllTaskAssignedMembers(projectId);

  const { data: project } = useGetOneProjectWithSpanshot(projectId);

  const snapshot = project?.snapshot;

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
        (task) => task.status === "in-progress",
      ).length,
      label: "IN PROGRESS",
    },
    {
      icon: <XSquare className="h-6 w-6 text-red-500" />,
      change: "+28%",
      value: (allProjectTasks ?? []).filter(
        (task) => task.status === "not_started",
      ).length,
      label: "STUCK",
      valueColor: "text-red-500",
    },
    {
      icon: <BarChart2 className="h-6 w-6 text-purple-400" />,
      change: "+36%",
      value: 9,
      label: "AVG. COMPLETION",
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
      <div className="min-w-0 w-full">
        <h1 className="mb-2 text-2xl font-bold text-foreground">
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
                    stat.valueColor ?? "text-gray-900 dark:text-gray-100"
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
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
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
          <div className="relative mt-4 w-full min-w-0 overflow-x-auto pb-2 no-scrollbar">
            <div className="flex w-max gap-4">
              {boardSupertasks.map((supertask) => (
                <Card
                  key={supertask.id}
                  className="w-[85vw] shrink-0 border-dashed sm:w-70"
                >
                  <CardContent className="p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-semibold text-foreground">
                        {supertask.title}
                      </h3>

                      <Badge variant="secondary">
                        {supertask.tasks.length}
                      </Badge>
                    </div>

                    <div className="flex max-h-[55vh] flex-col gap-3 overflow-y-auto pr-1">
                      {supertask.tasks.map((task) => (
                        <div
                          key={task.id}
                          className="rounded-lg border bg-background p-3 shadow-sm"
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-foreground">
                              {task.title}
                            </p>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => {
                                setSelectedBoardCard(task);
                                setBoardDialogOpen(true);
                              }}
                              aria-label={`View ${task.title}`}
                            >
                              <Eye className="h-4 w-4 text-primary" />
                            </Button>
                          </div>

                          <p className="mt-1 text-sm text-muted-foreground">
                            {task.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mock board card dialog */}
      <BoardCardDialog
        card={selectedBoardCard}
        open={boardDialogOpen}
        onOpenChange={(open) => {
          setBoardDialogOpen(open);

          if (!open) {
            setSelectedBoardCard(null);
          }
        }}
      />

      <ViewTaskDialog
        task={selectedTimelineTask}
        open={timelineDialogOpen}
        onOpenChange={(open) => {
          setTimelineDialogOpen(open);
          if (!open) {
            setSelectedTimelineTask(null);
          }
        }}
      />
    </AppLayout>
  );
}
