import type { LucideIcon } from "lucide-react";
import { ArrowRight, Code2, FileText, Frame, Link2 } from "lucide-react";
import { toast } from "sonner";
import type { ProjectResource, ResourceCategory } from "@/types/resource";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useGetResourceLinks } from "@/hooks/useResourceLink";
import { Spinner } from "../ui/spinner";

interface CategoryStyle {
  icon: LucideIcon;
  iconClass: string;
  barClass: string;
}

const CATEGORY_STYLES: Record<ResourceCategory, CategoryStyle> = {
  Links: {
    icon: Frame,
    iconClass: "bg-violet-100 text-violet-700",
    barClass: "border-violet-400",
  },
  "Paper Files": {
    icon: FileText,
    iconClass: "bg-blue-100 text-blue-700",
    barClass: "border-blue-400",
  },
  Code: {
    icon: Code2,
    iconClass: "bg-emerald-100 text-emerald-700",
    barClass: "border-emerald-400",
  },
};

function linkLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

interface ResourceDialogProps {
  resource: ProjectResource | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenResource: (resourceId: string) => void;
  isOpening?: boolean;
}

export default function ResourceDialog({
  resource,
  open,
  onOpenChange,
  onOpenResource,
  isOpening = false,
}: ResourceDialogProps) {
  // Hooks must run before any early return, and `links` must exist
  // before anything below reads it.
  const {
    data: links = [],
    isLoading: linksLoading,
    isError: linksError,
    refetch,
  } = useGetResourceLinks(resource?.id ?? "");

  if (!resource) return null;

  const category = CATEGORY_STYLES[resource.category];
  const Icon = category.icon;
  const author = resource.creator
    ? `${resource.creator.first_name} ${resource.creator.last_name}`.trim() ||
      resource.creator.email
    : "Former member";
  const fileSize = resource.file
    ? resource.file.size < 1024 * 1024
      ? `${(resource.file.size / 1024).toFixed(0)} KB`
      : `${(resource.file.size / (1024 * 1024)).toFixed(1)} MB`
    : links.length > 0
      ? `${links.length} link${links.length !== 1 ? "s" : ""}`
      : "No link or file";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg overflow-hidden dark:bg-background *:min-w-0">
        <DialogHeader>
          <div className="flex items-start gap-3 pr-8">
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg",
                category.iconClass,
              )}
            >
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 space-y-2">
              <DialogTitle>{resource.title}</DialogTitle>
              <Badge variant="outline" className="text-[10px]">
                {resource.category}
              </Badge>
            </div>
          </div>
          <DialogDescription
            className={cn(
              "border-l-2 pl-3 italic leading-relaxed",
              category.barClass,
            )}
          >
            {resource.description}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/20 p-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Type</p>
            <p className="font-medium">
              {resource.file?.content_type ??
                (links.length > 0 ? "Link" : "No link or file")}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Size/Source</p>
            <p className="font-medium break-all">{fileSize}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Author</p>
            <p className="font-medium">{author}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Last updated</p>
            <p className="font-medium">
              {new Date(resource.updated_at).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Times used</p>
            <p className="font-medium">{resource.uses}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Pinned</p>
            <p className="font-medium">{resource.pinned ? "Yes" : "No"}</p>
          </div>
        </div>

        {/* Resource links */}
        <section className="mt-4 min-w-0">
          {linksLoading ? (
            <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
              <Spinner className="size-4" />
              Loading links...
            </div>
          ) : linksError ? (
            <div className="flex items-center justify-between gap-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <span>Couldn't load links.</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (refetch) {
                    refetch();
                  } else {
                    toast.error("Could not load links. Please try again.");
                  }
                }}
              >
                Retry
              </Button>
            </div>
          ) : links.length === 0 ? (
            <p className="text-sm text-muted-foreground">No links yet.</p>
          ) : (
            // Read-only: adding and removing links lives in the Edit dialog.
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Link2 className="size-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Links</h3>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {links.length}
                </span>
              </div>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.id}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-lg border bg-muted/10 px-3 py-2 transition-colors hover:bg-muted/30"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[#FBF3E7] text-[#7A0C2E]">
                        <Link2 className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {link.title || linkLabel(link.url)}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {link.url}
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <DialogFooter>
          <Button
            variant="outline"
            type="button"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button
            type="button"
            disabled={(links.length === 0 && !resource.file) || isOpening}
            onClick={() => onOpenResource(resource.id)}
            className="bg-(--maroon) text-white hover:bg-(--maroon)/90"
          >
            {isOpening ? "Opening..." : "Open resource"}
            <ArrowRight className="size-3.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}