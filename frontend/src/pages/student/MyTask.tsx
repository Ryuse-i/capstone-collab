import { useState } from "react";
import AppLayout from "@/layouts/Applayout";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ViewTaskDialog } from "@/components/user/ViewTaskDialog";
import type { Skill } from "@/types/project_member";
import type { UserBase } from "@/types/user";
import type {
  TaskPriority,
  TaskResponseMembers,
  TaskStatus,
} from "@/types/task";

// ---------------------------------------------------------------------------
// remove the unused imports and variables if you don't need them. I kept them here for reference in case you want to use them later, input what wesley said in the cards information
// ---------------------------------------------------------------------------

type ProjectStatus = "Not Started" | "In Progress" | "Submitted" | "Completed";
type ProjectFilterStatus = "All" | ProjectStatus;
type ProjectPriority = "High" | "Medium" | "Low";

interface Project {
  id: string;
  tag: string;
  title: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  attachment?: {
    label: string;
    source: string;
    icon: "loom" | "drive" | "gitlab" | "file";
  };
  assigned: string[];
  due: string;
}

const allProjects: Project[] = [
  {
    id: "1",
    tag: "Web design",
    title: "Twottir - Redesign Project",
    description: "Here you will make a Twitter web redesign project",
    status: "Not Started",
    priority: "High",
    attachment: {
      label: "Twottir Project",
      source: "www.figma.com",
      icon: "file",
    },
    assigned: ["JW", "DM"],
    due: "02 May 23",
  },
  {
    id: "2",
    tag: "Mobile Design",
    title: "Sudoku - Mobile App",
    description: "Hello guys, here is the loom for this project. Keep it up!",
    status: "Submitted",
    priority: "Medium",
    attachment: { label: "Loom Video", source: "www.loom.com", icon: "loom" },
    assigned: ["HG"],
    due: "20 May 23",
  },
  {
    id: "3",
    tag: "Invoice",
    title: "Yalla Invoice",
    description:
      "Please check the file below and put all results into that file",
    status: "Not Started",
    priority: "Low",
    attachment: {
      label: "Invoice Check Up",
      source: "drive.google.com",
      icon: "drive",
    },
    assigned: ["JW", "HG", "RM"],
    due: "26 Apr 23",
  },
  {
    id: "4",
    tag: "App Developer",
    title: "Ankara API",
    description: "Here you will make a Twitter redesign project, here",
    status: "In Progress",
    priority: "High",
    attachment: {
      label: "Ankara-project",
      source: "www.gitlab.com",
      icon: "gitlab",
    },
    assigned: ["DM", "RM"],
    due: "14 May 23",
  },
  {
    id: "5",
    tag: "Dashboard",
    title: "Maddog - Dashboard UI",
    description:
      "Do it carefully and in accordance with the wishes of the client",
    status: "In Progress",
    priority: "Medium",
    attachment: {
      label: "Maddog Dashboard",
      source: "www.figma.com",
      icon: "file",
    },
    assigned: ["JW", "DM"],
    due: "12 May 23",
  },
  {
    id: "6",
    tag: "Mobile Design",
    title: "Notnot - Mobile App",
    description: "Hello guys, here is a brief file from the client. Good luck!",
    status: "Completed",
    priority: "Low",
    attachment: { label: "Loom Video", source: "www.loom.com", icon: "loom" },
    assigned: ["HG", "RM"],
    due: "03 Jul 23",
  },
  {
    id: "7",
    tag: "Web design",
    title: "Shaka - Landing Page",
    description:
      "Here I have provided the file for working on it, there is also a brief",
    status: "Completed",
    priority: "Medium",
    attachment: {
      label: "Shaka Landing Page",
      source: "www.figma.com",
      icon: "file",
    },
    assigned: ["JW", "HG"],
    due: "02 Jun 23",
  },
  {
    id: "8",
    tag: "Web design",
    title: "Gonial Landing Page",
    description: "Here you will make a landing page. Good luck!",
    status: "Completed",
    priority: "High",
    assigned: ["DM", "RM"],
    due: "11 Jun 23",
  },
];

const priorityStyle: Record<ProjectPriority, string> = {
  High: "bg-red-100 text-red-600",
  Medium: "bg-yellow-100 text-yellow-600",
  Low: "bg-gray-100 text-gray-500",
};

const tabs: { label: string; status: ProjectFilterStatus }[] = [
  { label: "All", status: "All" },
  { label: "Not Started", status: "Not Started" },
  { label: "In Progress", status: "In Progress" },
  { label: "Submitted", status: "Submitted" },
  { label: "Completed", status: "Completed" },
];

const projectStatusToTaskStatus: Record<ProjectStatus, TaskStatus> = {
  "Not Started": "not_started",
  "In Progress": "in-progress",
  Submitted: "submitted",
  Completed: "completed",
};

const projectPriorityToTaskPriority: Record<
  ProjectPriority,
  TaskPriority
> = {
  High: "high",
  Medium: "medium",
  Low: "low",
};

const projectToTask = (project: Project): TaskResponseMembers => ({
  id: project.id,
  name: project.title,
  description: project.description,
  created_by: "mock-user",
  project_id: "mock-project",
  priority: projectPriorityToTaskPriority[project.priority],
  category: "document",
  deadline: new Date(project.due).toISOString(),
  primary_skill: "Documentation" as Skill,
  status: projectStatusToTaskStatus[project.status],
  assigned_members: project.assigned.map(
    (member) =>
      ({
        id: member,
        first_name: member,
        last_name: "",
      }) as UserBase,
  ),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

export default function ProjectsList() {
  const [activeTab, setActiveTab] = useState<ProjectFilterStatus>("All");
  const [openTaskDialog, setOpenTaskDialog] = useState(false);
  const [selectedTask, setSelectedTask] =
    useState<TaskResponseMembers | null>(null);

  const filteredProjects =
    activeTab === "All"
      ? allProjects
      : allProjects.filter((p) => p.status === activeTab);

  const countFor = (status: ProjectFilterStatus) =>
    status === "All"
      ? allProjects.length
      : allProjects.filter((p) => p.status === status).length;

  return (
    <AppLayout breadcrumbs={[{ label: "Projects", href: "/projects" }]}>
      {/* Header */}
      <div className="">
        <div>
          <div className="flex items-center">
            <h1 className="text-(--text-h) text-2xl font-bold dark:text-card-foreground mb-2">
              Task List
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
          {tabs.map((tab) => (
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

      {/* Project cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredProjects.length === 0 ? (
          <div className="col-span-full text-center text-muted-foreground py-12">
            No projects in this stage yet.
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
                      setSelectedTask(projectToTask(project));
                      setOpenTaskDialog(true);
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
                    className={cn("border-0", priorityStyle[project.priority])}
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
