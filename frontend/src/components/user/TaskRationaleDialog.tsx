import { Info } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { cn } from "@/lib/utils";

import type { TaskAnalysis, TaskComplexity } from "@/types/task";

const COMPLEXITY_STYLES: Record<
  TaskComplexity,
  { label: string; className: string }
> = {
  low: {
    label: "Low",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  medium: {
    label: "Medium",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  high: {
    label: "High",
    className: "border-rose-200 bg-rose-50 text-rose-700",
  },
};

export function ComplexityBadge({
  complexity,
  className,
}: {
  complexity: TaskComplexity;
  className?: string;
}) {
  const style = COMPLEXITY_STYLES[complexity];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        style.className,
        className,
      )}
    >
      {style.label}
    </span>
  );
}

export interface TaskRationaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysis: TaskAnalysis | null;
  taskName?: string;
}

export function TaskRationaleDialog({
  open,
  onOpenChange,
  analysis,
  taskName,
}: TaskRationaleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-4 w-4 text-[#7A0C2E]" />
            Why this complexity?
          </DialogTitle>

          <DialogDescription>
            {taskName
              ? `How "${taskName}" was rated.`
              : "How this task was rated."}
          </DialogDescription>
        </DialogHeader>

        {analysis ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <ComplexityBadge complexity={analysis.complexity} />

              <span className="text-sm text-muted-foreground">
                {analysis.complexity_points} / 3 complexity points
              </span>
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-foreground">Rationale</p>

              <p className="text-sm leading-relaxed text-muted-foreground">
                {analysis.rationale}
              </p>
            </div>

            <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              This rating is AI-generated for an average IT capstone student
              with no prior thesis-writing experience. It is a guide for
              workload balancing, not a judgment of any individual.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No analysis available yet.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
