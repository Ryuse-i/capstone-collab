import type { LucideIcon } from "lucide-react";
import { ArrowRight, Code2, FileText, Frame } from "lucide-react";
import type { Resource } from "@/pages/student/Resources";
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

interface CategoryStyle {
  icon: LucideIcon;
  iconClass: string;
  barClass: string;
}

const CATEGORY_STYLES: Record<Resource["category"], CategoryStyle> = {
  "Links": {
    icon: Frame,
    iconClass:
      "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
    barClass: "border-violet-400",
  },
  "Paper Files": {
    icon: FileText,
    iconClass:
      "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
    barClass: "border-blue-400",
  },
  Code: {
    icon: Code2,
    iconClass:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    barClass: "border-emerald-400",
  },
};

interface ResourceDialogProps {
  resource: Resource | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ResourceDialog({
  resource,
  open,
  onOpenChange,
}: ResourceDialogProps) {
  if (!resource) return null;

  const category = CATEGORY_STYLES[resource.category];
  const Icon = category.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg dark:bg-background">
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
            <p className="font-medium">{resource.type}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Size/Source</p>
            <p className="font-medium">{resource.size}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Author</p>
            <p className="font-medium">{resource.author}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Last updated</p>
            <p className="font-medium">{resource.updatedAt}</p>
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
            className="bg-(--maroon) text-white hover:bg-(--maroon)/90"
          >
            Open resource
            <ArrowRight className="size-3.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
