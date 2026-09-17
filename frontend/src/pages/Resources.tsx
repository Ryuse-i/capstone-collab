import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Code2,
  Database,
  FileText,
  Frame,
  Link2,
  Star,
  Clock,
} from "lucide-react";
import AppLayout from "@/layouts/Applayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface Resource {
  id: number;
  title: string;
  category: ResourceCategory;
  description: string;
  type: string;
  size: string;
  author: string;
  updatedAt: string;
  pinned: boolean;
  uses: number;
}

type ResourceCategory =
  | "Figma Links"
  | "Paper Files"
  | "Code"
  | "Datasets"
  | "Tools & Links";

type ResourceFilter = "All" | "Pinned" | ResourceCategory;

interface CategoryConfig {
  name: ResourceCategory;
  count: number;
  icon: LucideIcon;
  iconClass: string;
  barClass: string;
}

const CATEGORIES: CategoryConfig[] = [
  {
    name: "Figma Links",
    count: 6,
    icon: Frame,
    iconClass: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
    barClass: "border-violet-400",
  },
  {
    name: "Paper Files",
    count: 15,
    icon: FileText,
    iconClass: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
    barClass: "border-blue-400",
  },
  {
    name: "Code",
    count: 12,
    icon: Code2,
    iconClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    barClass: "border-emerald-400",
  },
  {
    name: "Datasets",
    count: 10,
    icon: Database,
    iconClass: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    barClass: "border-amber-400",
  },
  {
    name: "Tools & Links",
    count: 5,
    icon: Link2,
    iconClass: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
    barClass: "border-rose-400",
  },
];

export const RESOURCES: Resource[] = [
  {
    id: 1,
    title: "Capstone UI Mockups (Figma)",
    category: "Figma Links",
    description: "Final screen designs and interaction flows for the capstone system.",
    type: "Live link",
    size: "figma.com",
    author: "Kevin",
    updatedAt: "3d ago",
    pinned: true,
    uses: 24,
  },
  {
    id: 2,
    title: "Chapter 1-3 Manuscript",
    category: "Paper Files",
    description: "Working manuscript covering the background, review, and methodology.",
    type: "PDF",
    size: "2.4 MB",
    author: "May",
    updatedAt: "2d ago",
    pinned: true,
    uses: 18,
  },
  {
    id: 3,
    title: "Frontend Repository",
    category: "Code",
    description: "React application source code, components, and project configuration.",
    type: "GitHub",
    size: "github.com",
    author: "Ari",
    updatedAt: "5h ago",
    pinned: true,
    uses: 31,
  },
  {
    id: 4,
    title: "Survey Response Dataset",
    category: "Datasets",
    description: "Anonymized responses collected during the capstone user study.",
    type: "XLSX",
    size: "840 KB",
    author: "Tey",
    updatedAt: "1w ago",
    pinned: false,
    uses: 16,
  },
  {
    id: 5,
    title: "System Architecture Diagram",
    category: "Figma Links",
    description: "Service boundaries, data flow, and deployment architecture overview.",
    type: "Live link",
    size: "figma.com",
    author: "Kevin",
    updatedAt: "4d ago",
    pinned: true,
    uses: 21,
  },
  {
    id: 6,
    title: "Defense Presentation Deck",
    category: "Paper Files",
    description: "Presentation slides prepared for the final capstone defense.",
    type: "PPTX",
    size: "8.1 MB",
    author: "May",
    updatedAt: "6d ago",
    pinned: false,
    uses: 11,
  },
  {
    id: 7,
    title: "API Documentation",
    category: "Tools & Links",
    description: "Shared endpoint reference for frontend and backend integration work.",
    type: "Live link",
    size: "swagger.io",
    author: "Ari",
    updatedAt: "1d ago",
    pinned: false,
    uses: 14,
  },
  {
    id: 8,
    title: "Gantt Chart Timeline",
    category: "Tools & Links",
    description: "Milestones, task dependencies, and target dates for the project plan.",
    type: "Live link",
    size: "docs.google.com",
    author: "Tey",
    updatedAt: "1w ago",
    pinned: false,
    uses: 9,
  },
  {
    id: 9,
    title: "Reference Papers Folder",
    category: "Paper Files",
    description: "Curated sources and related studies used by the research team.",
    type: "Folder",
    size: "12.6 MB",
    author: "Kevin",
    updatedAt: "2w ago",
    pinned: false,
    uses: 7,
  },
];

const FILTERS: { label: string; value: ResourceFilter; count: number }[] = [
  { label: "All", value: "All", count: 48 },
  { label: "Pinned", value: "Pinned", count: 5 },
  ...CATEGORIES.map((category) => ({
    label: category.name === "Tools & Links" ? "Tools" : category.name,
    value: category.name,
    count: category.count,
  })),
];

function getCategory(category: ResourceCategory) {
  return CATEGORIES.find((item) => item.name === category) ?? CATEGORIES[0];
}

export default function Resources() {
  const [activeTab, setActiveTab] = useState<ResourceFilter>("All");

  const filteredResources = RESOURCES.filter((resource) => {
    if (activeTab === "All") return true;
    if (activeTab === "Pinned") return resource.pinned;
    return resource.category === activeTab;
  });

  return (
    <AppLayout breadcrumbs={[{ label: "Resources", href: "/resources" }]}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 py-2">
        <header>
          <h1 className="mb-1 text-2xl font-semibold tracking-tight text-foreground">
            Resources
          </h1>
          <p className="text-sm text-muted-foreground">
            48 files · 127 MB used · Figma links, paper files, and shared code
          </p>
        </header>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle>Browse by category</CardTitle>
            <CardDescription>Quick access to your capstone files</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
              {CATEGORIES.map((category) => {
                const Icon = category.icon;
                return (
                  <Button
                    key={category.name}
                    type="button"
                    variant="ghost"
                    className="h-auto justify-start gap-3 px-2 py-2 text-left hover:bg-muted/60"
                    onClick={() => setActiveTab(category.name)}
                  >
                    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", category.iconClass)}>
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{category.name}</span>
                      <span className="block text-xs font-normal text-muted-foreground">
                        {category.count} files
                      </span>
                    </span>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ResourceFilter)}>
          <TabsList className="h-auto max-w-full flex-wrap justify-start gap-1 bg-transparent p-0">
            {FILTERS.map((filter) => (
              <TabsTrigger
                key={filter.label}
                value={filter.value}
                className="h-8 gap-2 rounded-full px-3 text-xs data-active:bg-(--maroon) data-active:text-white data-active:shadow-sm"
              >
                {filter.label}
                <Badge
                  variant="secondary"
                  className="h-5 rounded-full bg-transparent px-1.5 text-[10px] text-current"
                >
                  {filter.count}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredResources.map((resource) => {
            const category = getCategory(resource.category);
            const Icon = category.icon;
            return (
              <Card
                key={resource.id}
                className="gap-3 border border-border/70 py-0 transition-all hover:-translate-y-0.5 hover:border-(--maroon)/40 hover:shadow-md"
              >
                <CardHeader className="pt-4">
                  <div className="flex items-start gap-3">
                    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", category.iconClass)}>
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="truncate text-sm font-semibold">{resource.title}</CardTitle>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      {resource.category}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pb-4">
                  <p className={cn("border-l-2 pl-3 text-sm italic leading-relaxed text-muted-foreground", category.barClass)}>
                    {resource.description}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {resource.type} · {resource.size} · By {resource.author} · {resource.updatedAt}
                  </p>
                </CardContent>
                <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-3">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {resource.pinned ? <Star className="size-3.5 fill-secondary text-secondary" /> : <Clock className="size-3.5" />}
                    {resource.pinned ? `Pinned · ${resource.uses} uses` : `${resource.uses} uses`}
                  </span>
                  <Button variant="outline" size="sm" type="button">
                    Open
                    <ArrowRight className="size-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}