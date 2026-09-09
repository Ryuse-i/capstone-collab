import { useState } from "react";
import AppLayout from "@/layouts/Applayout";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ViewTaskDialog } from "@/components/user/ViewTaskDialog";
import type {
  TaskPriority,
  TaskResponseMembers,
  TaskStatus,
} from "@/types/task";
import { useGetAllTaskAssignedMembers } from "@/hooks/useTask";
import { useCurrentUser } from "@/hooks/useAuth";

export default function MyTask() {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<"All" | "Not Started" | "In Progress" | "Submitted" | "Completed">("All");
  const [openTaskDialog, setOpenTaskDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskResponseMembers | null>(null);

  // Fetch tasks assigned to the current user
  const userId = currentUser?.id || "";
  const { data: tasks = [], isLoading, error } = useGetAllTaskAssignedMembers(userId);

  // Transform backend tasks to match the UI format expected by the existing components
  const projects = tasks.map((task) => {
    // Generate a tag from primary skill (take first letters of each word)
    const tag = task.primary_skill
      .replace(/\s+/g, " ")
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 4) || "TASK";

    // Convert task status to display format - handle undefined status
    let displayStatus: "Not Started" | "In Progress" | "Submitted" | "Completed" = "Not Started";
    if (task.status) {
      switch (task.status) {
        case "not_started":
          displayStatus = "Not Started";
          break;
        case "in-progress":
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
        .map((member) => `${member.first_name} ${member.last_name || ""}`.trim())
        .filter(Boolean),
      due: dueDate,
    };
  });

  const filteredProjects =
    activeTab === "All"
      ? projects
      : projects.filter((p) => p.status === activeTab);

  const countFor = (
    status: "All" | "Not Started" | "In Progress" | "Submitted" | "Completed"
  ) => {
    if (status === "All") {
      return projects.length;
    }
    return projects.filter((p) => p.status === status).length;
  };

  // Show loading state while waiting for user data or tasks
  if (userLoading || isLoading) {
    return (
      <AppLayout breadcrumbs={[{ label: "My Tasks", href: "/mytask" }]}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-b-transparent"></div>
            <p className="mt-2 text-sm text-muted-foreground">Loading your tasks...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout breadcrumbs={[{ label: "My Tasks", href: "/mytask" }]}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Button variant="outline" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
          <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-4">
            <p>Failed to load tasks. Please try again.</p>
          </div>
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
            <h1 className="text-(--text-h) text-2xl font-bold dark:text-card-foreground mb-2">
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
          filteredProjects.map((project) => (
            <Card
              key={project.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardContent className="p-4 flex flex-col gap-3">
                <div>
                  <h3 className="font-semibold text-foreground leading-snug">
                    {project.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {project.description}
                  </p>
                </div>

                {project.attachment && (
                  <Button
                    variant="outline"
                    className="w-full h-11 justify-between rounded-md border bg-muted/30 px-3 text-sm font-medium hover:bg-muted/50"
                    onClick={() => {
                      // Find the original task object to pass to the dialog
                      const originalTask = tasks.find((t) => t.id === project.id);
                      if (originalTask) {
                        setSelectedTask(originalTask);
                        setOpenTaskDialog(true);
                      }
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <span>View Task</span>
                    </span>
                    <Eye className="h-4 w-4 text-primary" />
                  </Button>
                )}

                <div className="flex items-center justify-between pt-1">
                  <Badge
                    className={cn(
                      "border-0",
                      project.priority === "high"
                        ? "bg-red-100 text-red-600"
                        : project.priority === "medium"
                        ? "bg-yellow-100 text-yellow-600"
                        : "bg-gray-100 text-gray-500"
                    )}
                  >
                    {project.priority}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {project.due}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <ViewTaskDialog
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