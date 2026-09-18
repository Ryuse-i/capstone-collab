import {
  Calendar,
  CircleCheck,
  Clock,
  Gauge,
  Tag,
  Users,
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
import { useGetTaskMembers } from "@/hooks/useAssignedMember";
import { useUpdateTask } from "@/hooks/useTask";
import { useState, useEffect } from "react";
import type {
  TaskStatus,
  TaskComplexity,
  TaskPriority,
  TaskResponseMembers,
} from "@/types/task";

// Soft pill badges (outline-tinted, like the reference "In Research" / "Low" pills)
// rather than solid-fill badges — reserved for the header meta rows.
const statusPillStyle: Record<TaskStatus, string> = {
  completed: "bg-green-50 text-green-700",
  submitted: "bg-blue-50 text-blue-700",
  in_progress: "bg-yellow-50 text-yellow-700",
  not_started: "bg-gray-100 text-gray-500",
};

const statusDotStyle: Record<TaskStatus, string> = {
  completed: "bg-green-500",
  submitted: "bg-blue-500",
  in_progress: "bg-yellow-500",
  not_started: "bg-gray-400",
};

const priorityPillStyle: Record<TaskPriority, string> = {
  high: "bg-red-50 text-red-600",
  medium: "bg-yellow-50 text-yellow-600",
  low: "bg-gray-50 text-gray-600",
};

const priorityDotStyle: Record<TaskPriority, string> = {
  high: "bg-red-500",
  medium: "bg-yellow-500",
  low: "bg-gray-400",
};

const complexityPillStyle: Record<TaskComplexity, string> = {
  high: "bg-red-50 text-red-600",
  medium: "bg-yellow-50 text-yellow-600",
  low: "bg-gray-50 text-gray-600",
};

const complexityDotStyle: Record<TaskComplexity, string> = {
  high: "bg-red-500",
  medium: "bg-yellow-500",
  low: "bg-gray-400",
};

function formatStatusLabel(status: string) {
  return status
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

interface ViewTaskDialogProps {
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

export function ViewTaskDialog({
  open,
  onOpenChange,
  task,
}: ViewTaskDialogProps) {
  // Fetch the live assigned-members list for this task rather than trusting
  // whatever `task.assigned_members` snapshot was passed in as a prop —
  // only fetch while the dialog is open and a task is actually selected.
  const {
    data: assignedMembers,
    isLoading: membersLoading,
    isError: membersError,
  } = useGetTaskMembers(task?.id ?? "");

  const shouldFetchMembers = open && !!task?.id;

  const [taskData, setTaskData] = useState<TaskResponseMembers | null>(task);
  const updateTaskMutation = useUpdateTask();

  useEffect(() => {
    if (task) {
      setTaskData(task);
    }
  }, [task]);

  const handleStartTask = () => {
    if (!taskData?.id) return;
    updateTaskMutation.mutate(
      {
        id: taskData.id,
        task: {
          started_at: new Date().toISOString(),
        },
      },
      {
        onSuccess: (updatedTask) => {
          setTaskData((prev) => (prev ? { ...prev, ...updatedTask } : prev));
        },
      },
    );
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

        {taskData ? (
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-6 pb-6">
            {/* Title */}
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              {taskData.name}
            </h2>

            {/* Description panel */}
            {taskData.description && (
              <div className="mt-4 rounded-lg bg-muted/20 p-4">
                <p className="text-sm font-semibold text-foreground mb-1.5">
                  Description
                </p>

                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {taskData.description}
                </p>
              </div>
            )}

            {/* Meta rows */}
            <div className="divide-y divide-border/60">
              {/* Status */}
              <MetaRow icon={<CircleCheck className="size-4" />} label="Status">
                <Badge
                  className={`border-0 gap-1.5 font-medium ${
                    statusPillStyle[taskData.status ?? "not_started"]
                  }`}
                >
                  <span
                    className={`size-1.5 rounded-full ${
                      statusDotStyle[taskData.status ?? "not_started"]
                    }`}
                  />
                  {formatStatusLabel(taskData.status ?? "not_started")}
                </Badge>
              </MetaRow>

              {/* Priority */}
              <MetaRow icon={<Gauge className="size-4" />} label="Priority">
                <Badge
                  className={`border-0 gap-1.5 font-medium ${
                    priorityPillStyle[taskData.priority]
                  }`}
                >
                  <span
                    className={`size-1.5 rounded-full ${
                      priorityDotStyle[taskData.priority]
                    }`}
                  />
                  {taskData.priority.charAt(0).toUpperCase() +
                    taskData.priority.slice(1)}
                </Badge>
              </MetaRow>

              {/* Complexity */}
              {taskData.complexity && (
                <MetaRow icon={<Gauge className="size-4" />} label="Complexity">
                  <Badge
                    className={`border-0 gap-1.5 font-medium ${
                      complexityPillStyle[taskData.complexity]
                    }`}
                  >
                    <span
                      className={`size-1.5 rounded-full ${
                        complexityDotStyle[taskData.complexity]
                      }`}
                    />
                    {taskData.complexity.charAt(0).toUpperCase() +
                      taskData.complexity.slice(1)}
                  </Badge>
                </MetaRow>
              )}

              {/* Due Date */}
              <MetaRow icon={<Calendar className="size-4" />} label="Due Date">
                <span className="text-sm text-foreground">
                  {taskData.deadline
                    ? new Date(taskData.deadline).toLocaleString(undefined, {
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
              {taskData.primary_skill && (
                <MetaRow
                  icon={<Tag className="size-4" />}
                  label="Primary Skill"
                >
                  <Badge
                    variant="secondary"
                    className="font-normal bg-muted text-foreground"
                  >
                    {taskData.primary_skill}
                  </Badge>
                </MetaRow>
              )}

              {/* Secondary Skills */}
              {taskData.secondary_skills &&
                taskData.secondary_skills.length > 0 && (
                  <MetaRow
                    icon={<Tag className="size-4" />}
                    label="Secondary Skills"
                  >
                    {taskData.secondary_skills.map((skill) => (
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

              {/* Assigned Members */}
              <MetaRow icon={<Users className="size-4" />} label="Assigned To">
                {!shouldFetchMembers ? null : membersLoading ? (
                  <span className="text-sm text-muted-foreground">
                    Loading assigned members...
                  </span>
                ) : membersError ? (
                  <span className="text-sm text-rose-600">
                    Couldn't load assigned members.
                  </span>
                ) : assignedMembers && assignedMembers.length > 0 ? (
                  assignedMembers.map((member) => (
                    <span
                      key={member.id}
                      className="flex items-center gap-1.5 rounded-full border border-[#7A0C2E]/20 bg-[#FBF3E7] px-2 py-1 text-xs text-[#231A2E]"
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-medium text-[#7A0C2E]">
                        {member.first_name?.charAt(0)}
                        {member.last_name?.charAt(0)}
                      </span>
                      {member.first_name} {member.last_name}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">
                    No assigned members. Please choose a member to perform the
                    task.
                  </span>
                )}
              </MetaRow>
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

        {/* Footer */}
        <div className="border-t px-6 py-3 shrink-0 flex justify-end bg-muted/50">
          {taskData &&
          taskData.status === "not_started" &&
          !taskData.started_at ? (
            <Button
              variant="default"
              onClick={handleStartTask}
              className="min-w-24"
              disabled={updateTaskMutation.isPending}
            >
              {updateTaskMutation.isPending ? "Starting..." : "Start Task"}
            </Button>
          ) : null}
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
