import { Calendar, CircleCheck, Clock, Gauge, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  TaskResponse,
  TaskStatus,
  TaskComplexity,
  TaskPriority,
} from "@/types/task";

// Soft pill badges (outline-tinted, like the reference "In Research" / "Low" pills)
// rather than solid-fill badges — reserved for the header meta rows.
const statusPillStyle: Record<TaskStatus, string> = {
  completed: "bg-green-50 text-green-700",
  submitted: "bg-yellow-50 text-yellow-700",
  "in-progress": "bg-blue-50 text-blue-700",
  not_started: "bg-gray-100 text-gray-500",
};

const statusDotStyle: Record<TaskStatus, string> = {
  completed: "bg-green-500",
  submitted: "bg-yellow-500",
  "in-progress": "bg-blue-500",
  not_started: "bg-gray-400",
};

const priorityPillStyle: Record<TaskPriority, string> = {
  high: "bg-red-50 text-red-600",
  medium: "bg-yellow-50 text-yellow-600",
  low: "bg-indigo-50 text-indigo-600",
};

const complexityPillStyle: Record<TaskComplexity, string> = {
  high: "bg-red-50 text-red-600",
  medium: "bg-yellow-50 text-yellow-600",
  low: "bg-indigo-50 text-indigo-600",
};

interface ViewTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskResponse | null;
}

function MetaRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="flex w-32 shrink-0 items-center gap-2 text-sm text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex flex-1 flex-wrap items-center gap-1.5">
        {children}
      </div>
    </div>
  );
}

export function ViewTaskDialog({
  open,
  onOpenChange,
  task,
}: ViewTaskDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="rounded-2xl p-0 overflow-hidden sm:max-w-150 max-h-[85vh] flex flex-col gap-0"
      >
        <DialogTitle className="absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0 [clip:rect(0,0,0,0)]">
          Task details
        </DialogTitle>

        {/* Top bar: close button pinned to the right */}
        <div className="flex items-center justify-end px-5 py-4 shrink-0">
          <DialogClose asChild>
            <button
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
          </DialogClose>
        </div>

        {task ? (
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-6 pb-6">
            {/* Title */}
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              {task.name}
            </h2>

            {/* Description panel */}
            {task.description && (
              <div className="mt-4 rounded-lg bg-muted/20 p-4">
                <p className="text-sm font-semibold text-foreground mb-1.5">
                  Description
                </p>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {task.description}
                </p>
              </div>
            )}
            {/* Meta rows */}
            <div className="divide-y divide-border/60">
              <MetaRow icon={<CircleCheck className="size-4" />} label="Status">
                <Badge
                  className={`border-0 gap-1.5 font-medium ${statusPillStyle[task.status ?? "not_started"]}`}
                >
                  <span
                    className={`size-1.5 rounded-full ${statusDotStyle[task.status ?? "not_started"]}`}
                  />
                  {(task.status ?? "not_started").replace(/[-_]/g, " ")}
                </Badge>
              </MetaRow>

              <MetaRow icon={<Gauge className="size-4" />} label="Priority">
                <Badge
                  className={`border-0 font-medium ${priorityPillStyle[task.priority]}`}
                >
                  {task.priority.charAt(0).toUpperCase() +
                    task.priority.slice(1)}
                </Badge>
              </MetaRow>

              {task.complexity && (
                <MetaRow icon={<Gauge className="size-4" />} label="Complexity">
                  <Badge
                    className={`border-0 font-medium ${complexityPillStyle[task.complexity]}`}
                  >
                    {task.complexity.charAt(0).toUpperCase() +
                      task.complexity.slice(1)}
                  </Badge>
                </MetaRow>
              )}

              <MetaRow icon={<Calendar className="size-4" />} label="Due Date">
                <span className="text-sm text-foreground">
                  {task.deadline
                    ? new Date(task.deadline).toLocaleString(undefined, {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : "No deadline"}
                </span>
              </MetaRow>

              {task.primary_skill && (
                <MetaRow
                  icon={<Tag className="size-4" />}
                  label="Primary Skill"
                >
                  <Badge
                    variant="secondary"
                    className="font-normal bg-muted text-foreground"
                  >
                    {task.primary_skill}
                  </Badge>
                </MetaRow>
              )}

              {task.secondary_skills && task.secondary_skills.length > 0 && (
                <MetaRow
                  icon={<Tag className="size-4" />}
                  label="Secondary Skills"
                >
                  {task.secondary_skills.map((skill) => (
                    <Badge
                      key={skill}
                      variant="secondary"
                      className="font-normal bg-muted text-foreground"
                    >
                      {skill}
                    </Badge>
                  ))}
                </MetaRow>
              )}

              {/* TODO: real assignee avatars once TaskResponse includes assignees,
                  styled as an overlapping avatar stack like the reference */}
            </div>

            {/* TODO: Activity / Comments tabs once the backend exposes a
                task activity feed — reference design shows a tabbed
                Activity / My Work / Assigned / Comments log below the
                description panel. */}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center px-6 pb-6 text-sm text-muted-foreground">
            <Clock className="size-4 mr-2" />
            No task selected.
          </div>
        )}

        <div className="border-t px-6 py-3 shrink-0 flex justify-end">
          <DialogClose asChild>
            <Button variant="outline" className="min-w-24">
              Close
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
