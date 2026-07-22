import { useState } from "react";
import AppLayout from "@/layouts/Applayout";
import {
  Pin,
  
  Plus,
  SlidersHorizontal,
  MoreHorizontal,
  Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ---------------------------------------------------------------------------
// remove the unused imports and variables if you don't need them. I kept them here for reference in case you want to use them later, input what wesley said in the cards information
// ---------------------------------------------------------------------------
type ProjectStatus = "Todo" | "In Progress" | "Completed";

interface Project {
  id: string;
  tag: string;
  title: string;
  description: string;
  status: ProjectStatus;
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
    status: "Todo",
    attachment: { label: "Twottir Project", source: "www.figma.com", icon: "file" },
    assigned: ["JW", "DM"],
    due: "02 May 23",
  },
  {
    id: "2",
    tag: "Mobile Design",
    title: "Sudoku - Mobile App",
    description: "Hello guys, here is the loom for this project. Keep it up!",
    status: "Todo",
    attachment: { label: "Loom Video", source: "www.loom.com", icon: "loom" },
    assigned: ["HG"],
    due: "20 May 23",
  },
  {
    id: "3",
    tag: "Invoice",
    title: "Yalla Invoice",
    description: "Please check the file below and put all results into that file",
    status: "Todo",
    attachment: { label: "Invoice Check Up", source: "drive.google.com", icon: "drive" },
    assigned: ["JW", "HG", "RM"],
    due: "26 Apr 23",
  },
  {
    id: "4",
    tag: "App Developer",
    title: "Ankara API",
    description: "Here you will make a Twitter redesign project, here",
    status: "In Progress",
    attachment: { label: "Ankara-project", source: "www.gitlab.com", icon: "gitlab" },
    assigned: ["DM", "RM"],
    due: "14 May 23",
  },
  {
    id: "5",
    tag: "Dashboard",
    title: "Maddog - Dashboard UI",
    description: "Do it carefully and in accordance with the wishes of the client",
    status: "In Progress",
    attachment: { label: "Maddog Dashboard", source: "www.figma.com", icon: "file" },
    assigned: ["JW", "DM"],
    due: "12 May 23",
  },
  {
    id: "6",
    tag: "Mobile Design",
    title: "Notnot - Mobile App",
    description: "Hello guys, here is a brief file from the client. Good luck!",
    status: "Completed",
    attachment: { label: "Loom Video", source: "www.loom.com", icon: "loom" },
    assigned: ["HG", "RM"],
    due: "03 Jul 23",
  },
  {
    id: "7",
    tag: "Web design",
    title: "Shaka - Landing Page",
    description: "Here I have provided the file for working on it, there is also a brief",
    status: "Completed",
    attachment: { label: "Shaka Landing Page", source: "www.figma.com", icon: "file" },
    assigned: ["JW", "HG"],
    due: "02 Jun 23",
  },
  {
    id: "8",
    tag: "Web design",
    title: "Gonial Landing Page",
    description: "Here you will make a landing page. Good luck!",
    status: "Completed",
    assigned: ["DM", "RM"],
    due: "11 Jun 23",
  },
];

const tagStyle: Record<string, string> = {
  "Web design": "bg-blue-50 text-blue-600",
  "Mobile Design": "bg-pink-50 text-pink-600",
  Invoice: "bg-green-50 text-green-600",
  "App Developer": "bg-orange-50 text-orange-600",
  Dashboard: "bg-violet-50 text-violet-600",
};

const attachmentIcon: Record<NonNullable<Project["attachment"]>["icon"], string> = {
  loom: "🎥",
  drive: "📁",
  gitlab: "🦊",
  file: "🎨",
};

const tabs: { label: string; status: ProjectStatus }[] = [
  { label: "Todo", status: "Todo" },
  { label: "In Progress", status: "In Progress" },
  { label: "Completed", status: "Completed" },
];

// ---------------------------------------------------------------------------

export default function ProjectsList() {
  const [activeTab, setActiveTab] = useState<ProjectStatus>("Todo");

  const filteredProjects = allProjects.filter((p) => p.status === activeTab);
  const countFor = (status: ProjectStatus) =>
    allProjects.filter((p) => p.status === status).length;

  return (
    <AppLayout
      breadcrumbs={[
        { label: "Projects", href: "/projects" },
        
      ]}
    >
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">Projects List</h1>
            <Pin className="h-4 w-4 text-muted-foreground rotate-45" />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Here is a list of projects that you have created
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {["JW", "DM", "HG", "RM"].map((initials) => (
              <div
                key={initials}
                className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold ring-2 ring-background"
              >
                {initials}
              </div>
            ))}
            <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold ring-2 ring-background">
              +4
            </div>
          </div>
          <Button className="gap-2">Export</Button>
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
                variant="secondary"
                className={cn(
                  "px-1.5 py-0 text-xs font-semibold",
                  activeTab === tab.status && "bg-primary/10 text-primary",
                )}
              >
                {countFor(tab.status)}
              </Badge>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            Filter &amp; Sort
          </Button>
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add New
          </Button>
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
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <Badge
                    className={cn(
                      "border-0 font-medium",
                      tagStyle[project.tag] ?? "bg-gray-100 text-gray-600",
                    )}
                  >
                    {project.tag}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem>Duplicate</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div>
                  <h3 className="font-semibold text-foreground leading-snug">
                    {project.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {project.description}
                  </p>
                </div>

                {project.attachment && (
                  <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-2.5 py-2">
                    <span className="text-base leading-none">
                      {attachmentIcon[project.attachment.icon]}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {project.attachment.label}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                        <Link2 className="h-3 w-3" />
                        {project.attachment.source}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <div className="flex -space-x-2">
                    {project.assigned.map((initials, i) => (
                      <div
                        key={i}
                        className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold ring-2 ring-background"
                      >
                        {initials}
                      </div>
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">{project.due}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </AppLayout>
  );
}