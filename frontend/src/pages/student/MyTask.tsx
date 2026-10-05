import { useState } from "react";
import AppLayout from "@/layouts/Applayout";
import { AlertTriangle } from "lucide-react";
import { ArrowRight, TriangleAlert } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MyTaskDialog } from "@/components/user/MyTaskDialog";
import type { TaskResponseMembers } from "@/types/task";
import { useGetTasksForUser } from "@/hooks/useTask";
import { useCurrentUser } from "@/hooks/useAuth";

function getDeadlineUrgency(task: TaskResponseMembers) {
  if (!task.deadline || task.status === "completed") return null;

  const deadline = new Date(task.deadline);
  const now = new Date();

  if (Number.isNaN(deadline.getTime())) return null;
  if (deadline < now) return "overdue" as const;

  const dueIn48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  return deadline < dueIn48Hours ? ("soon" as const) : null;
}

// ---------------------------------------------------------------------------
// Loading Skeleton
// ---------------------------------------------------------------------------

function MyTaskSkeleton() {
  return (
    <div>
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="my-2">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {[1, 2, 3, 4, 5].map((item) => (
            <Skeleton
              key={item}
              className={`h-8 rounded-full ${
                item === 1
                  ? "w-16"
                  : item === 2
                    ? "w-28"
                    : item === 3
                      ? "w-24"
                      : item === 4
                        ? "w-24"
                        : "w-24"
              }`}
            />
          ))}
        </div>
      </div>

      {/* ── Task Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
          <Card
            key={item}
            className="gap-3 border border-border/70 py-0"
          >
            <CardHeader className="pt-4">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="mt-2 h-4 w-3/4" />
                </div>

                <Skeleton className="h-6 w-6 shrink-0 rounded-full" />
              </div>
            </CardHeader>

            <CardContent className="space-y-3 pb-4">
              {/* Description */}
              <div className="border-l-2 border-muted pl-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-5/6" />
              </div>

              {/* Priority + date */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-14" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>

                <Skeleton className="h-4 w-16" />
              </div>
            </CardContent>

            {/* Open button */}
            <div className="flex items-center justify-end border-t bg-muted/30 px-4 py-3">
              <Skeleton className="h-9 w-20 rounded-md" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function MyTask() {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();

  const [activeTab, setActiveTab] = useState<
    "All" | "Not Started" | "In Progress" | "Submitted" | "Completed"
  >("All");

  const [openTaskDialog, setOpenTaskDialog] = useState(false);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Fetch tasks assigned to the current user
  const userId = currentUser?.id || "";

  const {
    data: tasks = [],
    isLoading,
    error,
  } = useGetTasksForUser(userId);

  // Transform backend tasks to match the UI format expected by the existing components
  // Include the original task object to avoid stale closure issues in onClick handlers
  const projectsWithTask = tasks.map((task) => {
    // Generate a tag from primary skill (take first letters of each word)
    const tag =
      task.primary_skill
        .replace(/\s+/g, " ")
        .split(" ")
        .map((word) => word[0])
        .join("")
        .toUpperCase()
        .slice(0, 4) || "TASK";

    // Convert task status to display format - handle undefined status
    let displayStatus:
      | "Not Started"
      | "In Progress"
      | "Submitted"
      | "Completed" = "Not Started";

    if (task.status) {
      switch (task.status) {
        case "not_started":
          displayStatus = "Not Started";
          break;
        case "in_progress":
          displayStatus = "In Progress";
          break;
        case "submitted":
          displayStatus = "Submitted";
          break;
        case "completed":
          displayStatus = "Completed";
          break;
        default:
          displayStatus = "Not Started";
      }
    }

    // Format date
    let dueDate = "Soon";

    if (task.deadline) {
      try {
        const date = new Date(task.deadline);

        dueDate = date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "2-digit",
        });
      } catch {
        // Keep default if date parsing fails
      }
    }

    return {
      id: task.id,
      tag,
      title: task.name,
      description: task.description,
      status: displayStatus,
      priority: task.priority,
      attachment: {
        label: `${task.primary_skill} Task`,
        source: "internal",
        icon: "file" as const,
      },
      assigned: task.assigned_members
        .map(
          (member) =>
            `${member.first_name} ${member.last_name || ""}`.trim(),
        )
        .filter(Boolean),
      due: dueDate,
      task: task,
    };
  });

  const filteredProjects =
    activeTab === "All"
      ? projectsWithTask
      : projectsWithTask.filter((project) => project.status === activeTab);

  const countFor = (
    status: "All" | "Not Started" | "In Progress" | "Submitted" | "Completed",
  ) => {
    if (status === "All") {
      return projectsWithTask.length;
    }

    return projectsWithTask.filter((project) => project.status === status)
      .length;
  };

  return (
    <AppLayout breadcrumbs={[{ label: "My Tasks", href: "/mytask" }]}>
      {userLoading || isLoading ? (
        <MyTaskSkeleton />
      ) : error ? (
        <div className="flex h-screen flex-col items-center justify-center gap-4">
          <AlertTriangle className="h-8 w-8 text-destructive" />

          <p className="text-foreground dark:text-muted-foreground">
            Failed to load project data. Please try again later.
          </p>
        </div>
      ) : (
        <>
          {/* Header */}
          <div>
            <div>
              <div className="flex items-center">
                <h1 className="my-2 text-2xl font-bold text-(--text-h) dark:text-card-foreground">
                  My Tasks
                </h1>
              </div>

              <p className="text-sm text-muted-foreground">
                Here is a list of tasks that you are assigned to
              </p>
            </div>
          </div>

          {/* Tabs + actions */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Tabs
              value={activeTab}
              onValueChange={(value) =>
                setActiveTab(
                  value as
                    | "All"
                    | "Not Started"
                    | "In Progress"
                    | "Submitted"
                    | "Completed",
                )
              }
            >
              <TabsList
                className="h-auto max-w-full flex-wrap justify-start gap-1 bg-transparent p-0"
                indicatorClassName="rounded-full bg-(--maroon) dark:bg-(--maroon) shadow-sm"
              >
                {[
                  { label: "All", status: "All" as const },
                  {
                    label: "Not Started",
                    status: "Not Started" as const,
                  },
                  {
                    label: "In Progress",
                    status: "In Progress" as const,
                  },
                  {
                    label: "Submitted",
                    status: "Submitted" as const,
                  },
                  {
                    label: "Completed",
                    status: "Completed" as const,
                  },
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.status}
                    value={tab.status}
                    className="h-8 gap-2 rounded-full px-3 text-xs transition-colors duration-300 ease-out hover:bg-muted data-active:bg-transparent! data-active:text-white! data-active:shadow-none! data-active:hover:bg-transparent! data-active:hover:text-white! data-[state=active]:bg-transparent! data-[state=active]:shadow-none! data-[state=active]:hover:bg-transparent! data-[state=active]:hover:text-white!"
                  >
                    {tab.label}

                    <Badge
                      variant="secondary"
                      className="h-5 rounded-full bg-transparent px-1.5 text-[10px] text-current transition-colors duration-300"
                    >
                      {countFor(tab.status)}
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* Task cards grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {filteredProjects.length === 0 ? (
              <div className="col-span-full py-12 text-center text-muted-foreground">
                No tasks in this stage yet.
              </div>
            ) : (
              filteredProjects.map((project) => {
                const deadlineUrgency = getDeadlineUrgency(project.task);

                return (
                  <Card
                    key={project.id}
                    className="gap-3 border border-border/70 py-0 transition-all hover:-translate-y-0.5 hover:border-(--maroon)/40 hover:shadow-md"
                  >
                    <CardHeader className="pt-4">
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="line-clamp-2 min-h-10 text-sm font-semibold leading-snug">
                            {project.title}
                          </CardTitle>
                        </div>

                        <Badge
                          variant="outline"
                          className="shrink-0 border-0 bg-transparent p-0 text-[10px]"
                        >
                          {deadlineUrgency ? (
                            <span className="flex items-center justify-center rounded-full bg-red-100/80 p-1.5 shadow-[0_0_12px_rgba(239,68,68,0.35)] ring-1 ring-red-200/80 dark:bg-red-500/10 dark:ring-red-400/30">
                              <TriangleAlert
                                className={cn(
                                  "size-3.5",
                                  deadlineUrgency === "overdue"
                                    ? "text-red-600"
                                    : "text-yellow-600",
                                )}
                                aria-label={
                                  deadlineUrgency === "overdue"
                                    ? "Overdue"
                                    : "Due soon"
                                }
                              />
                            </span>
                          ) : (
                            project.status
                          )}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3 pb-4">
                      <p className="line-clamp-2 border-l-2 border-(--maroon) pl-3 text-sm italic leading-relaxed text-muted-foreground">
                        {project.description}
                      </p>

                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-muted-foreground">
                            Priority·
                          </p>

                          <Badge
                            className={cn(
                              "border-0",
                              project.priority === "high"
                                ? "bg-red-100 text-red-600"
                                : project.priority === "medium"
                                  ? "bg-yellow-100 text-yellow-600"
                                  : "bg-gray-100 text-gray-500",
                            )}
                          >
                            {project.priority.charAt(0).toUpperCase() + project.priority.slice(1)}
                          </Badge>
                        </div>

                        <span className="text-xs text-muted-foreground">
                          {project.due}
                        </span>
                      </div>
                    </CardContent>

                    <div className="flex items-center justify-end border-t bg-muted/30 px-4 py-3">
                      <Button
                        variant="outline"
                        className="w- rounded-md"
                        onClick={(e) => {
                          e.stopPropagation();

                          if (project.task) {
                            setSelectedTaskId(project.task.id);
                            setOpenTaskDialog(true);
                          }
                        }}
                      >
                        Open
                        <ArrowRight className="size-3.5" />
                      </Button>
                    </div>
                  </Card>
                );
              })
            )}
          </div>

          <MyTaskDialog
            open={openTaskDialog}
            onOpenChange={(open) => {
              if (!open) {
                setSelectedTaskId(null);
              }

              setOpenTaskDialog(open);
            }}
            task={tasks.find(task => task.id === selectedTaskId) ?? null}
          />
        </>
      )}
    </AppLayout>
  );
}