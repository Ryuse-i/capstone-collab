import { useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, ArrowRight, Code2, FileText, Frame, PlusCircle } from "lucide-react";

import { AddResoourceDialog } from "@/components/user/AddResourceDialog";
import ResourceDialog from "@/components/user/ResourceDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCreateProjectResource, useOpenProjectResource, useProjectResources } from "@/hooks/useResource";
import AppLayout from "@/layouts/Applayout";
import { cn } from "@/lib/utils";
import type { ProjectResource, ResourceCategory } from "@/types/resource";

const numberFormat = new Intl.NumberFormat();

interface CategoryConfig {
  name: ResourceCategory;
  icon: LucideIcon;
  iconClass: string;
  barClass: string;
}

const categories: CategoryConfig[] = [
  {
    name: "Links",
    icon: Frame,
    iconClass: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
    barClass: "border-violet-400",
  },
  {
    name: "Paper Files",
    icon: FileText,
    iconClass: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
    barClass: "border-blue-400",
  },
  {
    name: "Code",
    icon: Code2,
    iconClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    barClass: "border-emerald-400",
  },
];

type ResourceFilter = "All" | ResourceCategory;

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** unitIndex).toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatRelativeDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
  if (days === 0) return "Today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

function getCategory(category: ResourceCategory): CategoryConfig {
  return categories.find((item) => item.name === category) ?? categories[0];
}

function getAuthor(resource: ProjectResource): string {
  if (!resource.creator) return "Former member";
  return `${resource.creator.first_name} ${resource.creator.last_name}`.trim() || resource.creator.email;
}

function getType(resource: ProjectResource): string {
  if (!resource.file) return "Live link";
  const extension = resource.file.filename.split(".").pop();
  return extension && extension !== resource.file.filename
    ? extension.toUpperCase()
    : resource.file.content_type;
}

export interface ProjectResourcesPanelProps {
  projectId?: string;
  projectName?: string;
  projectLoading?: boolean;
  projectError?: boolean;
  projectSelector?: ReactNode;
  noProjectMessage?: string;
  withLayout?: boolean;
}

export default function ProjectResourcesPanel({
  projectId,
  projectName,
  projectLoading = false,
  projectError = false,
  projectSelector,
  noProjectMessage = "No project is available for resources yet.",
  withLayout = true,
}: ProjectResourcesPanelProps) {
  const [activeTab, setActiveTab] = useState<ResourceFilter>("All");
  const [selectedResource, setSelectedResource] = useState<ProjectResource | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const resourcesQuery = useProjectResources(projectId);
  const createResource = useCreateProjectResource(projectId ?? "");
  const openResource = useOpenProjectResource(projectId ?? "");

  const resources = resourcesQuery.data ?? [];
  const filteredResources = activeTab === "All"
    ? resources
    : resources.filter((resource) => resource.category === activeTab);
  const totalSize = resources.reduce(
    (total, resource) => total + (resource.file?.size ?? 0),
    0,
  );
  const filters: { label: ResourceFilter; count: number }[] = [
    { label: "All", count: resources.length },
    ...categories.map((category) => ({
      label: category.name,
      count: resources.filter((resource) => resource.category === category.name).length,
    })),
  ];

  async function handleCreate(resource: Parameters<typeof createResource.mutateAsync>[0]) {
    if (!projectId) return;
    setMessage(null);
    try {
      await createResource.mutateAsync(resource);
      setMessage("Resource added to this project.");
    } catch (error) {
      const detail = (error as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      setMessage(detail ?? "Could not add the resource. Please try again.");
      throw error;
    }
  }

  async function handleOpen(resourceId: string) {
    if (!projectId) return;
    setMessage(null);
    try {
      const result = await openResource.mutateAsync(resourceId);
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      const detail = (error as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      setMessage(detail ?? "Could not open this resource. Please try again.");
    }
  }

  const loading = projectLoading || (Boolean(projectId) && resourcesQuery.isLoading);

  const content = (
    <>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-2">
        <header>
          <h1 className="my-2 text-2xl font-semibold tracking-tight text-foreground">Resources</h1>
          <p className="text-sm text-muted-foreground">
            {projectName ? `${projectName} · ` : ""}
            {numberFormat.format(resources.length)} resources · {formatBytes(totalSize)} attached files
          </p>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ResourceFilter)}>
            <TabsList
              className="h-auto max-w-full flex-wrap justify-start gap-1 bg-transparent p-0"
              indicatorClassName="rounded-full bg-(--maroon) dark:bg-(--maroon) shadow-sm"
            >
              {filters.map((filter) => (
                <TabsTrigger
                  key={filter.label}
                  value={filter.label}
                  className="h-8 gap-2 rounded-full px-3 text-xs transition-colors duration-300 ease-out hover:bg-muted data-active:bg-transparent! data-active:text-white! data-active:shadow-none! data-active:hover:bg-transparent! data-active:hover:text-white! data-[state=active]:bg-transparent! data-[state=active]:shadow-none! data-[state=active]:hover:bg-transparent! data-[state=active]:hover:text-white!"
                >
                  {filter.label}
                  <Badge variant="secondary" className="h-5 rounded-full bg-transparent px-1.5 text-[10px] text-current">
                    {filter.count}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {projectSelector}
            <AddResoourceDialog
              isPending={createResource.isPending}
              onCreate={handleCreate}
              trigger={
                <Button size="sm" className="h-8" disabled={!projectId || projectLoading}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  ADD RESOURCE
                </Button>
              }
            />
          </div>
        </div>

        {projectError ? (
          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
            <AlertTriangle className="size-4" />
            Could not load projects. Try again later.
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((item) => <Card key={item} className="h-56 animate-pulse bg-muted/40" />)}
          </div>
        ) : !projectId ? (
          <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
            {noProjectMessage}
          </div>
        ) : resourcesQuery.isError ? (
          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
            <AlertTriangle className="size-4" />
            Could not load project resources. Try again later.
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="rounded-md border border-dashed p-10 text-center">
            <p className="text-sm font-medium">
              {activeTab === "All" ? "No resources added to this project yet." : `No ${activeTab.toLowerCase()} resources yet.`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Add a link or file for your team.</p>
          </div>
        ) : (
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
                        <CardTitle className="line-clamp-2 min-h-10 text-sm font-semibold leading-snug">
                          {resource.title}
                        </CardTitle>
                      </div>
                      <Badge variant="outline" className="shrink-0 text-[10px]">{resource.category}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pb-4">
                    <p className={cn("border-l-2 pl-3 text-sm italic leading-relaxed text-muted-foreground", category.barClass)}>
                      {resource.description}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {getType(resource)} · {resource.file ? formatBytes(resource.file.size) : resource.source_url} · {formatRelativeDate(resource.updated_at)}
                    </p>
                  </CardContent>
                  <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-3">
                    <p className="truncate text-xs text-muted-foreground">By {getAuthor(resource)}</p>
                    <Button variant="outline" size="sm" type="button" onClick={() => setSelectedResource(resource)}>
                      Open
                      <ArrowRight className="size-3.5" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <ResourceDialog
        resource={selectedResource}
        open={selectedResource !== null}
        onOpenChange={(open) => !open && setSelectedResource(null)}
        onOpenResource={handleOpen}
        isOpening={openResource.isPending}
      />
    </>
  );

  return withLayout ? (
    <AppLayout breadcrumbs={[{ label: "Resources", href: "/resources" }]}>
      {content}
    </AppLayout>
  ) : content;
}