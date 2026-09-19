import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Code2, FileText, Frame } from "lucide-react";
import AppLayout from "@/layouts/Applayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ResourceDialog from "@/components/user/ResourceDialog";
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

type ResourceCategory = "Figma Links" | "Paper Files" | "Code";

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
    iconClass:
      "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
    barClass: "border-violet-400",
  },
  {
    name: "Paper Files",
    count: 15,
    icon: FileText,
    iconClass:
      "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
    barClass: "border-blue-400",
  },
  {
    name: "Code",
    count: 12,
    icon: Code2,
    iconClass:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    barClass: "border-emerald-400",
  },
];

export const RESOURCES: Resource[] = [
  {
    id: 1,
    title: "Capstone UI Mockups (Figma)",
    category: "Figma Links",
    description:
      "Final screen designs and interaction flows for the capstone system.",
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
    description:
      "Working manuscript covering the background, review, and methodology.",
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
    description:
      "React application source code, components, and project configuration.",
    type: "GitHub",
    size: "github.com",
    author: "Ari",
    updatedAt: "5h ago",
    pinned: true,
    uses: 31,
  },
  {
    id: 4,
    title: "System Architecture Diagram",
    category: "Figma Links",
    description:
      "Service boundaries, data flow, and deployment architecture overview.",
    type: "Live link",
    size: "figma.com",
    author: "Kevin",
    updatedAt: "4d ago",
    pinned: true,
    uses: 21,
  },
  {
    id: 5,
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
    id: 6,
    title: "Reference Papers Folder",
    category: "Paper Files",
    description:
      "Curated sources and related studies used by the research team.",
    type: "Folder",
    size: "12.6 MB",
    author: "Kevin",
    updatedAt: "2w ago",
    pinned: false,
    uses: 7,
  },
];

const FILTERS: { label: string; value: ResourceFilter; count: number }[] = [
  { label: "All", value: "All", count: 33 },
  { label: "Pinned", value: "Pinned", count: 4 },
  ...CATEGORIES.map((category) => ({
    label: category.name,
    value: category.name,
    count: category.count,
  })),
];

function getCategory(category: ResourceCategory) {
  return CATEGORIES.find((item) => item.name === category) ?? CATEGORIES[0];
}

export default function Resources() {
  const [activeTab, setActiveTab] = useState<ResourceFilter>("All");
  const [selectedResource, setSelectedResource] = useState<Resource | null>(
    null,
  );

  const filteredResources = RESOURCES.filter((resource) => {
    if (activeTab === "All") return true;
    if (activeTab === "Pinned") return resource.pinned;
    return resource.category === activeTab;
  });

  return (
    <AppLayout breadcrumbs={[{ label: "Resources", href: "/resources" }]}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-2">
        <header>
          <h1 className="my-2 text-2xl font-semibold tracking-tight text-foreground">
            Resources
          </h1>
          <p className="text-sm text-muted-foreground">
            33 files · 127 MB used · Figma links, paper files, and shared code
          </p>
        </header>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as ResourceFilter)}
        >
          <TabsList className="h-auto max-w-full flex-wrap justify-start gap-1 bg-transparent p-0">
            {FILTERS.map((filter) => (
              <TabsTrigger
                key={filter.label}
                value={filter.value}
                className="h-8 gap-2 rounded-full px-3 text-xs hover:bg-muted data-active:bg-(--maroon)! data-active:text-white! data-active:hover:bg-(--maroon)! data-active:hover:text-white! data-active:shadow-sm"
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
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-lg",
                        category.iconClass,
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="line-clamp-2 min-h-10 text-sm font-semibold leading-snug">
                        {resource.title}
                      </CardTitle>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      {resource.category}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pb-4">
                  <p
                    className={cn(
                      "border-l-2 pl-3 text-sm italic leading-relaxed text-muted-foreground",
                      category.barClass,
                    )}
                  >
                    {resource.description}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {resource.type} · {resource.size} · {resource.updatedAt}
                  </p>
                </CardContent>
                <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-3">
                  <p className="truncate text-xs text-muted-foreground">
                    By {resource.author}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => setSelectedResource(resource)}
                  >
                    Open
                    <ArrowRight className="size-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <ResourceDialog
        resource={selectedResource}
        open={selectedResource !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedResource(null);
        }}
      />
    </AppLayout>
  );
}
