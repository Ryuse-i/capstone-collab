import { useState } from "react";
import AppLayout from "@/layouts/Applayout";
import { AlertTriangle } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { ArrowRight, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function MyTask() {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<
    "All" | "Not Started" | "In Progress" | "Submitted" | "Completed"
  >("All");
  const [openTaskDialog, setOpenTaskDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskResponseMembers | null>(
    null,
  );

  // Fetch tasks assigned to the current user
  const userId = currentUser?.id || "";
  const { data: tasks = [], isLoading, error } = useGetTasksForUser(userId);

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
      } catch (e) {
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
        .map((member) =>
          `${member.first_name} ${member.last_name || ""}`.trim(),
        )
        .filter(Boolean),
      due: dueDate,
      task: task, // Include the original task object
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

  // Show loading state while waiting for user data or tasks
  if (userLoading || isLoading) {
    return (
      <AppLayout breadcrumbs={[{ label: "My Tasks", href: "/mytask" }]}>
        <div className="flex justify-center items-center flex-1">
          <Spinner/>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout breadcrumbs={[{ label: "My Tasks", href: "/mytask" }]}>
          <div className="flex flex-col justify-center items-center gap-4 h-screen">
    <AlertTriangle className="h-8 w-8 text-destructive" />
    <p className="text-foreground dark:text-muted-foreground">
      Failed to load project data. Please try again later.
    </p>
  </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout breadcrumbs={[{ label: "My Tasks", href: "/mytask" }]}>
      {/* Header */}
      <div className="">
        <div>
          <div className="flex items-center">
            <h1 className="text-(--text-h) text-2xl font-bold dark:text-card-foreground my-2">
              My Tasks
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Here is a list of tasks that you are assigned to
          </p>
        </div>
      </div>

      {/* Tabs + actions */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-1">
          {[
            { label: "All", status: "All" as const },
            { label: "Not Started", status: "Not Started" as const },
            { label: "In Progress", status: "In Progress" as const },
            { label: "Submitted", status: "Submitted" as const },
            { label: "Completed", status: "Completed" as const },
          ].map((tab) => (
            <button
              key={tab.status}
              onClick={() => setActiveTab(tab.status)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                activeTab === tab.status
                  ? "bg-background text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
              <Badge
                variant={activeTab === tab.status ? "secondary" : "default"}
                className={cn(
                  "px-1.5 py-0 text-xs font-semibold",
                  activeTab === tab.status
                    ? "text-secondary-foreground"
                    : "text-muted-foreground",
                )}
              >
                {countFor(tab.status)}
              </Badge>
            </button>
          ))}
        </div>
      </div>

      {/* Task cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredProjects.length === 0 ? (
          <div className="col-span-full text-center text-muted-foreground py-12">
            No tasks in this stage yet.
          </div>
        ) : (
          filteredProjects.map((project) => {
            const deadlineUrgency = getDeadlineUrgency(project.task);

            return (
              <Card
                key={project.id}
                className="gap-3 border border-border/70 py-0 transition-all hover:-translate-y-0.5 hover:border-(--maroon)/40 hover:shadow-md"
                onClick={() => {
                  // Use the original task object we attached to avoid stale closures
                  if (project.task) {
                    setSelectedTask(project.task);
                    setOpenTaskDialog(true);
                  }
                }}
              >
                <CardHeader className="pt-4">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="line-clamp-2 min-h-10 text-sm font-semibold leading-snug">
                        {project.title}
                      </CardTitle>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[10px] border-0">
                      {deadlineUrgency ? (
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
                      ) : (
                        project.status
                      )}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pb-4">
                  <p className="border-l-2 border-(--maroon) pl-3 text-sm italic leading-relaxed text-muted-foreground line-clamp-2">
                    {project.description}
                  </p>
                  <div className="flex items-center justify-between gap-3">
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
                      {project.priority}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {project.due}
                    </span>
                  </div>
                </CardContent>

                {project.attachment && (
                  <div className="flex items-center justify-end border-t bg-muted/30 px-4 py-3">
                    <Button
                      variant="outline"
                      className="w- rounded-md"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent triggering card click
                        // Use the original task object we attached to avoid stale closures
                        if (project.task) {
                          setSelectedTask(project.task);
                          setOpenTaskDialog(true);
                        }
                      }}
                    >
                      View Task
                      <ArrowRight className="size-3.5" />
                    </Button>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      <MyTaskDialog
        open={openTaskDialog}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTask(null);
          }
          setOpenTaskDialog(open);
        }}
        task={selectedTask}
      />
    </AppLayout>
  );
}
