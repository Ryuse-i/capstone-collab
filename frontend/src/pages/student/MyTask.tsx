import { useState } from "react";
import AppLayout from "@/layouts/Applayout";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

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

const statusStyle: Record<ProjectStatus, string> = {
  "Not Started": "bg-gray-100 text-gray-500",
  "In Progress": "bg-blue-100 text-blue-700",
  Submitted: "bg-yellow-100 text-yellow-700",
  Completed: "bg-green-100 text-green-700",
};

const tabs: { label: string; status: ProjectFilterStatus }[] = [
  { label: "All", status: "All" },
  { label: "Not Started", status: "Not Started" },
  { label: "In Progress", status: "In Progress" },
  { label: "Submitted", status: "Submitted" },
  { label: "Completed", status: "Completed" },
];

export default function ProjectsList() {
  const [activeTab, setActiveTab] = useState<ProjectFilterStatus>("All");
  const [openTaskDialog, setOpenTaskDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

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
                      setSelectedProject(project);
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

      <Dialog
        open={openTaskDialog}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedProject(null);
          }
          setOpenTaskDialog(open);
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="rounded-xl p-0 overflow-hidden sm:max-w-250 max-h-[75vh] flex flex-col"
        >
          <DialogHeader className="border-b px-4 py-3 shrink-0">
            <DialogTitle>Task Details</DialogTitle>
            <DialogDescription>
              {selectedProject
                ? selectedProject.title
                : "Select a project to view details."}
            </DialogDescription>
          </DialogHeader>

          {selectedProject ? (
            <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar overflow-hidden px-4 py-4">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">
                  {selectedProject.title}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedProject.description}
                </p>
              </div>

              <div className="grid gap-3">
                <div className="rounded-md border bg-muted/50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Status
                  </p>
                  <Badge
                    className={cn(
                      "border-0 mt-2",
                      statusStyle[selectedProject.status],
                    )}
                  >
                    {selectedProject.status}
                  </Badge>
                </div>

                <div className="rounded-md border bg-muted/50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Priority
                  </p>
                  <Badge
                    className={cn(
                      "border-0 mt-2",
                      priorityStyle[selectedProject.priority],
                    )}
                  >
                    {selectedProject.priority}
                  </Badge>
                </div>

                <div className="rounded-md border bg-muted/50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Due date
                  </p>
                  <p className="mt-2 text-sm text-foreground">
                    {selectedProject.due}
                  </p>
                </div>

                <div className="rounded-md border bg-muted/50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Assigned users
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {selectedProject.assigned.map((member) => (
                      <div
                        key={member}
                        className="flex items-center gap-2 rounded-md bg-background/50 px-2 py-2"
                      >
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                          {member}
                        </div>
                        <span className="text-sm text-foreground">
                          {member}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter className="sticky bottom-0 z-10 bg-background/95 px-8 py-2 shrink-0">
            <DialogClose asChild>
              <Button variant="outline" className="min-w-24">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
