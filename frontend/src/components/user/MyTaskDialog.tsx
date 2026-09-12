import {
  Calendar,
  CircleCheck,
  Clock,
  Gauge,
  Tag,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUpdateTask } from "@/hooks/useTask";
import { useState } from "react";
import type {
  TaskStatus,
  TaskComplexity,
  TaskPriority,
  TaskResponseMembers,
} from "@/types/task";
import { formatDistanceToNow, isBefore, subHours } from "date-fns";

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

interface MyTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskResponseMembers | null;
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

export function MyTaskDialog({
  open,
  onOpenChange,
  task,
}: MyTaskDialogProps) {
  const updateTaskMutation = useUpdateTask();
  const [submissionOpen, setSubmissionOpen] = useState(false);
  const [submissionNotes, setSubmissionNotes] = useState("");
  const [submissionLink, setSubmissionLink] = useState("");

  const handleStartTask = () => {
    if (!task?.id) return;
    updateTaskMutation.mutate(
      {
        id: task.id,
        task: {
          started_at: new Date().toISOString(),
        },
      }
    );
  };

  const handleSubmitTask = () => {
    if (!task?.id) return;
    updateTaskMutation.mutate(
      {
        id: task.id,
        task: {
          status: "submitted",
          // Note: Assuming backend accepts notes and link fields for submission
          // If these fields don't exist on the task model, they'll be ignored
          // TODO: Check if backend has submission-specific fields
        },
      }
    );
  };

  // Calculate deadline urgency
  const getDeadlineUrgency = () => {
    if (!task?.deadline || task.status === "completed") return null;

    const deadline = new Date(task.deadline);
    const now = new Date();

    if (isBefore(deadline, now)) {
      // Overdue
      const daysOverdue = Math.floor(
        (now.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24)
      );
      return {
        type: "overdue" as const,
        message: `Overdue by ${daysOverdue} day${daysOverdue !== 1 ? "s" : ""}`,
        days: Math.abs(daysOverdue),
      };
    }

    const dueIn48h = subHours(now, -48); // 48 hours ago
    if (isBefore(deadline, dueIn48h)) {
      // Due within 48 hours
      const hoursUntil = Math.ceil(
        (deadline.getTime() - now.getTime()) / (1000 * 60 * 60)
      );
      return {
        type: "soon" as const,
        message: `Due in ${hoursUntil} hour${hoursUntil !== 1 ? "s" : ""}`,
        hours: hoursUntil,
      };
    }

    return null;
  };

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
            {/* Deadline Urgency Banner */}
            {getDeadlineUrgency() && (
              <div className="mb-4 p-3 rounded-lg">
                {getDeadlineUrgency()?.type === "overdue" ? (
                  <div className="bg-red-50 text-red-700 border border-red-200">
                    <strong>Overdue:</strong> {getDeadlineUrgency()?.message}
                  </div>
                ) : (
                  <div className="bg-yellow-50 text-yellow-700 border border-yellow-200">
                    <strong>Due soon:</strong> {getDeadlineUrgency()?.message}
                  </div>
                )}
              </div>
            )}

            {/* Title */}
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              {task?.name}
            </h2>

            {/* Description panel */}
            {task?.description && (
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
              {/* Status */}
              <MetaRow icon={<CircleCheck className="size-4" />} label="Status">
                <Badge
                  className={`border-0 gap-1.5 font-medium ${
                    statusPillStyle[task?.status ?? "not_started"]
                  }`}
                >
                  <span
                    className={`size-1.5 rounded-full ${
                      statusDotStyle[task?.status ?? "not_started"]
                    }`}
                  />
                  {(task?.status ?? "not_started").replace(/[-_]/g, " ")}
                </Badge>
              </MetaRow>

              {/* Priority */}
              <MetaRow icon={<Gauge className="size-4" />} label="Priority">
                <Badge
                  className={`border-0 font-medium ${
                    priorityPillStyle[task.priority]
                  }`}
                >
                  {task.priority.charAt(0).toUpperCase() +
                    task.priority.slice(1)}
                </Badge>
              </MetaRow>

              {/* Complexity */}
              {task?.complexity && (
                <MetaRow icon={<Gauge className="size-4" />} label="Complexity">
                  <Badge
                    className={`border-0 font-medium ${
                      complexityPillStyle[task.complexity]
                    }`}
                  >
                    {task.complexity.charAt(0).toUpperCase() +
                      task.complexity.slice(1)}
                  </Badge>
                  {/* TODO: backend needs to expose complexity reasoning */}
                </MetaRow>
              )}

              {/* Due Date */}
              <MetaRow icon={<Calendar className="size-4" />} label="Due Date">
                <span className="text-sm text-foreground">
                  {task?.deadline
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

              {/* Primary Skill */}
              {task?.primary_skill && (
                <MetaRow
                  icon={<Tag className="size-4" />}
                  label="Primary Skill"
                >
                  <Badge
                    variant="secondary"
                    className="font-normal bg-muted"
                  >
                    {task.primary_skill}
                  </Badge>
                </MetaRow>
              )}

              {/* Secondary Skills */}
              {task?.secondary_skills &&
                task.secondary_skills.length > 0 && (
                  <MetaRow
                    icon={<Tag className="size-4" />}
                    label="Secondary Skills"
                  >
                    {task.secondary_skills.map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="font-normal bg-muted"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </MetaRow>
                )}

              {/* Started/Elapsed Time */}
              {task?.started_at && (
                <MetaRow icon={<Clock className="size-4" />} label="Started">
                  <span className="text-sm text-foreground">
                    Started {formatDistanceToNow(new Date(task.started_at), {
                      addSuffix: true,
                    })}
                  </span>
                </MetaRow>
              )}
            </div>

            {/* Submission Form (for in-progress tasks) */}
            {submissionOpen && (
              <div className="mt-4 p-4 border-t border-border/60">
                <div className="mb-3">
                  <p className="text-sm font-semibold text-foreground mb-1">
                    Submit Task
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Add any notes or links for your submission:
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Notes
                    </label>
                    <textarea
                      value={submissionNotes}
                      onChange={(e) => setSubmissionNotes(e.target.value)}
                      placeholder="Add notes about your submission..."
                      className="w-full px-3 py-2 border border-input bg-background rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Link (optional)
                    </label>
                    <input
                      type="url"
                      value={submissionLink}
                      onChange={(e) => setSubmissionLink(e.target.value)}
                      placeholder="https://example.com/your-work"
                      className="w-full px-3 py-2 border border-input bg-background rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end pt-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSubmissionOpen(false);
                      setSubmissionNotes("");
                      setSubmissionLink("");
                    }}
                    className="mr-2"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    onClick={handleSubmitTask}
                    disabled={updateTaskMutation.isPending}
                  >
                    {updateTaskMutation.isPending ? "Submitting..." : "Submit Task"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center px-6 pb-6 text-sm text-muted-foreground">
            <Clock className="size-4 mr-2" />
            No task selected.
          </div>
        )}

        {/* Footer */}
        <div className="border-t px-6 py-3 shrink-0 flex justify-end bg-muted/50">
          {task && (
            <>
              {task.status === "not_started" && !task.started_at ? (
                <Button
                  variant="default"
                  onClick={handleStartTask}
                  className="min-w-24 mr-2"
                  disabled={updateTaskMutation.isPending}
                >
                  {updateTaskMutation.isPending ? "Starting..." : "Start Task"}
                </Button>
              ) : task.status === "in-progress" ? (
                <Button
                  variant="default"
                  onClick={() => setSubmissionOpen(true)}
                  className="min-w-24 mr-2"
                  disabled={updateTaskMutation.isPending}
                >
                  {updateTaskMutation.isPending ? "Submitting..." : "Submit Task"}
                </Button>
              ) : task.status === "submitted" ? (
                <span className="text-sm text-muted-foreground mr-2">
                  Waiting for review
                </span>
              ) : task.status === "completed" ? (
                <span className="text-sm text-muted-foreground mr-2">
                  Completed
                </span>
              ) : null}

              <DialogClose asChild>
                <Button variant="outline" className="min-w-24">
                  Close
                </Button>
              </DialogClose>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}