import { useEffect, useRef, useState } from "react";
import { Calendar, CircleCheck, Clock, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer";
import { formatStatusLabel } from "@/components/user/TaskTable";
import { TaskAttachments } from "@/components/user/TaskAttachments";
import { TaskLinks } from "@/components/user/TaskLinks";
import { TaskComments } from "@/components/user/TaskComments";
import { TaskRevisionNotes } from "@/components/user/TaskRevisionNotes";
import { useUpdateTask } from "@/hooks/useTask";
import { useRejectTask } from "@/hooks/useRevisionNotes";
import type { TaskResponseMembers } from "@/types/task";

const statusPill: Record<string, string> = {
  completed:
    "bg-green-50 text-green-700 dark:bg-green-500/20 dark:text-green-400",
  submitted: "bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
};

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
}

function Row({
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
      <div className="flex flex-1 flex-wrap items-center gap-1.5 text-sm text-foreground">
        {children}
      </div>
    </div>
  );
}

interface ViewSubmissionDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskResponseMembers | null;
}

export function ViewSubmissionDrawer({
  open,
  onOpenChange,
  task,
}: ViewSubmissionDrawerProps) {
  const updateTaskMutation = useUpdateTask();
  const rejectTaskMutation = useRejectTask();

  const [revisionOpen, setRevisionOpen] = useState(false);
  const [problem, setProblem] = useState("");
  const [recommendedChanges, setRecommendedChanges] = useState("");
  const revisionSectionRef = useRef<HTMLDivElement>(null);
  const problemTextareaRef = useRef<HTMLTextAreaElement>(null);

  const status = task?.status ?? "submitted";
  const isSubmitted = status === "submitted";
  const isCompleted = status === "completed";
  const isPending =
    updateTaskMutation.isPending || rejectTaskMutation.isPending;

  const resetRevisionForm = () => {
    setRevisionOpen(false);
    setProblem("");
    setRecommendedChanges("");
  };

  // Clear the revision form when the task changes or the drawer closes so
  // notes typed for one submission can't leak into another.
  useEffect(() => {
    resetRevisionForm();
  }, [task?.id, open]);

  // When the revision section opens, scroll it into view and focus the
  // Problem field. The short delay lets the section render first.
  useEffect(() => {
    if (!revisionOpen) return;

    const timer = window.setTimeout(() => {
      revisionSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
      problemTextareaRef.current?.focus({ preventScroll: true });
    }, 50);

    return () => window.clearTimeout(timer);
  }, [revisionOpen]);

  const handleApprove = () => {
    if (!task?.id) return;

    updateTaskMutation.mutate(
      {
        id: task.id,
        task: {
          status: "completed",
          completed_at: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          toast.success("Submission approved.");
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(
            err instanceof Error
              ? err.message
              : "Something went wrong while approving this submission.",
          );
        },
      },
    );
  };

  const handleReject = async () => {
    if (!task?.id) return;

    const trimmedProblem = problem.trim();
    if (!trimmedProblem) {
      toast.error("Please describe the problem before sending this back.");
      problemTextareaRef.current?.focus();
      return;
    }

    const trimmedChanges = recommendedChanges.trim();

    try {
      // 1. Create the revision note
      await rejectTaskMutation.mutateAsync({
        task_id: task.id,
        payload: {
          problem: trimmedProblem,
          recommended_changes: trimmedChanges || null,
        },
      });

      // 2. Explicitly revert the task to in_progress
      await updateTaskMutation.mutateAsync({
        id: task.id,
        task: {
          status: "in_progress",
        },
      });

      toast.success("Submission sent back for revision.");
      resetRevisionForm();
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Something went wrong while rejecting this submission.",
      );
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="ml-auto h-full w-full overflow-hidden rounded-none p-0 sm:max-w-2xl">
        <DrawerTitle className="sr-only">Submission details</DrawerTitle>

        <div className="flex shrink-0 items-center justify-end px-5 py-4">
          <DrawerClose asChild>
            <button
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
          </DrawerClose>
        </div>

        {task ? (
          <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-6 pb-6">
            <h2 className="mb-4 mt-2 text-2xl font-semibold text-foreground">
              {task.name}
            </h2>

            {task.description && (
              <div className="rounded-lg bg-muted/20 p-4">
                <p className="mb-1.5 text-sm font-semibold text-foreground">
                  Description
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {task.description}
                </p>
              </div>
            )}

            {/* Previous revision notes: only shows if this task was sent back before */}
            <TaskRevisionNotes taskId={task.id} title="Previous revision" />

            <div className="mt-4 divide-y divide-border/60">
              <Row icon={<CircleCheck className="size-4" />} label="Status">
                <Badge
                  className={`border-0 font-medium ${
                    statusPill[status] ?? "bg-gray-100 text-gray-500"
                  }`}
                >
                  {formatStatusLabel(status)}
                </Badge>
              </Row>

              <Row icon={<Calendar className="size-4" />} label="Due Date">
                {task.deadline ? formatDateTime(task.deadline) : "No deadline"}
              </Row>

              <Row icon={<Clock className="size-4" />} label="Submitted By">
                {task.assigned_members?.length ? (
                  task.assigned_members.map((m) => {
                    const name =
                      `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim() ||
                      m.email;
                    const initials =
                      `${m.first_name?.[0] ?? ""}${m.last_name?.[0] ?? ""}` ||
                      (m.email?.[0] ?? "?");
                    return (
                      <span
                        key={m.id}
                        className="flex items-center gap-1.5 rounded-full border bg-[#FBF3E7] py-0.5 pl-0.5 pr-3 text-xs text-[#231A2E]"
                      >
                        <Avatar className="size-6">
                          <AvatarFallback className="rounded-full bg-primary text-[9px] font-bold uppercase text-primary-foreground">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        {name}
                      </span>
                    );
                  })
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </Row>
            </div>

            <div className="mt-6 border-t pt-6">
              <TaskAttachments taskId={task.id} />
            </div>

            <div className="mt-6 border-t pt-6">
              <TaskLinks taskId={task.id} />
            </div>

            <div className="mt-6 border-t pt-6">
              <TaskComments taskId={task.id} />
            </div>

            {/* Revision section: only appears after pressing Reject */}
            {isSubmitted && revisionOpen && (
              <div
                ref={revisionSectionRef}
                className="mt-6 rounded-lg border border-red-200 bg-red-50/50 p-4 dark:border-red-500/30 dark:bg-red-500/10"
              >
                <p className="mb-1 text-sm font-semibold text-foreground">
                  Revision Notes
                </p>
                <p className="mb-4 text-sm text-muted-foreground">
                  Explain what is wrong with this submission. The member will
                  see these notes when the task is sent back.
                </p>

                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="revision-problem"
                      className="mb-1 block text-sm font-medium text-foreground"
                    >
                      Problem <span className="text-red-600">*</span>
                    </label>
                    <textarea
                      id="revision-problem"
                      ref={problemTextareaRef}
                      value={problem}
                      onChange={(e) => setProblem(e.target.value)}
                      placeholder="What is wrong or missing in this submission?"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary"
                      rows={4}
                      maxLength={5000}
                      disabled={isPending}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="revision-recommended-changes"
                      className="mb-1 block text-sm font-medium text-foreground"
                    >
                      Recommended changes{" "}
                      <span className="font-normal text-muted-foreground">
                        (optional)
                      </span>
                    </label>
                    <textarea
                      id="revision-recommended-changes"
                      value={recommendedChanges}
                      onChange={(e) => setRecommendedChanges(e.target.value)}
                      placeholder="Suggest how the member can fix it..."
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary"
                      rows={3}
                      maxLength={5000}
                      disabled={isPending}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            No submission selected.
          </div>
        )}

        <div className="flex shrink-0 items-center justify-end gap-2 border-t bg-muted/50 px-6 py-3">
          {task && isSubmitted ? (
            revisionOpen ? (
              <>
                <Button
                  variant="outline"
                  className="min-w-24"
                  onClick={resetRevisionForm}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="min-w-32"
                  onClick={handleReject}
                  disabled={isPending || !problem.trim()}
                >
                  {rejectTaskMutation.isPending ? (
                    <>
                      <Spinner className="mr-2 size-4" />
                      Sending...
                    </>
                  ) : (
                    "Send for revision"
                  )}
                </Button>
              </>
            ) : (
              <>
                <DrawerClose asChild>
                  <Button variant="outline" className="min-w-24">
                    Close
                  </Button>
                </DrawerClose>
                <Button
                  variant="outline"
                  className="min-w-24 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => setRevisionOpen(true)}
                  disabled={isPending}
                >
                  Reject
                </Button>
                <Button
                  className="min-w-24"
                  onClick={handleApprove}
                  disabled={isPending}
                >
                  {updateTaskMutation.isPending ? (
                    <>
                      <Spinner className="mr-2 size-4" />
                      Approving...
                    </>
                  ) : (
                    "Approve"
                  )}
                </Button>
              </>
            )
          ) : (
            <>
              {isCompleted && (
                <span className="mr-2 text-sm text-muted-foreground">
                  Approved
                </span>
              )}
              <DrawerClose asChild>
                <Button variant="outline" className="min-w-24">
                  Close
                </Button>
              </DrawerClose>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}