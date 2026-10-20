import { useRef, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CalendarIcon,
  Check,
  ChevronDown,
  Users,
  X,
  Lightbulb,
} from "lucide-react";
import { differenceInCalendarDays, format } from "date-fns";
import { toast } from "sonner";
import type { TaskIntent } from "@/lib/taskIntent";

import { useUpdateTask, taskKeys } from "@/hooks/useTask";
import {
  useGetAllProjectSupertasks,
  supertaskKeys,
} from "@/hooks/useSupertask";
import { useGetMembersWithUserInfo } from "@/hooks/useProjectMember";
import {
  useGetAllAssignedMembers,
  useCreateAssignedMember,
  useDeleteAssignedMember,
  assignedMemberKeys,
} from "@/hooks/useAssignedMember";
import {
  useGetTaskReviewers,
  useCreateAssignedReviewer,
  useUpdateAssignedReviewer,
  useDeleteAssignedReviewer,
} from "@/hooks/useCreateAssignedReviewer";
import { projectKeys } from "@/hooks/useProject";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TaskComments } from "@/components/user/TaskComments";
import DeleteTaskDialog from "@/components/user/DeleteTaskDialog";
import { TaskAttachments } from "./TaskAttachments";
import { TaskLinks } from "./TaskLinks";
import { TaskRevisionNotes } from "./TaskRevisionNotes";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

import { Calendar } from "@/components/ui/calendar";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { cn } from "@/lib/utils";

import type { Skill } from "@/types/project_member";

import type {
  TaskResponseMembers,
  TaskCategory,
  TaskPriority,
  UpdateTask,
} from "@/types/task";

/**
 * member_id is the project_members row id, which is what actually gets
 * persisted / FK-checked on the backend. `id` (the user id) is kept only
 * for display purposes.
 */
type AssignableMember = {
  member_id: string;
  id: string;
  first_name: string;
  last_name: string;
};

type TaskFormState = {
  supertask_id: string | null;
  name: string;
  description: string;
  priority: TaskPriority;
  category: TaskCategory;
  deadline: string;
  primary_skill: Skill | "";
  secondary_skills: Skill[];
};

const PRIORITY_OPTIONS: {
  value: TaskPriority;
  label: string;
}[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const priorityDotStyle: Record<TaskPriority, string> = {
  high: "bg-red-500",
  medium: "bg-yellow-500",
  low: "bg-gray-400",
};

const SKILL_OPTIONS: {
  value: Skill;
  label: string;
}[] = [
  { value: "Backend Development", label: "Backend Development" },
  { value: "Frontend Development", label: "Frontend Development" },
  { value: "Mobile Development", label: "Mobile Development" },
  { value: "IOT Development", label: "IOT Development" },
  { value: "Database Design", label: "Database Design" },
  { value: "System Architecture", label: "System Architecture" },
  { value: "UI/UX Design", label: "UI/UX Design" },
  {
    value: "Testing and Quality Assurance",
    label: "Testing and QA",
  },
  { value: "Literature Review", label: "Literature Review" },
  { value: "Data Collection", label: "Data Collection" },
  {
    value: "Survey and Questionnaire Design",
    label: "Survey/Questionnaire Design",
  },
  {
    value: "Interview and Observation",
    label: "Interview and Observation",
  },
  { value: "Data Analysis", label: "Data Analysis" },
  { value: "Technical Writing", label: "Technical Writing" },
  { value: "Documentation", label: "Documentation" },
  { value: "Diagram and Modeling", label: "Diagram and Modeling" },
  {
    value: "Editing and Proofreading",
    label: "Editing and Proofreading",
  },
  {
    value: "Financial Documentation",
    label: "Financial Documentation",
  },
  { value: "Budget Planning", label: "Budget Planning" },
  { value: "Resource Management", label: "Resource Management" },
];

function formStateFromTask(task: TaskResponseMembers): TaskFormState {
  const rawSupertaskId = (task as { supertask_id?: string | number | null })
    .supertask_id;

  return {
    supertask_id: rawSupertaskId != null ? String(rawSupertaskId) : null,
    name: task.name ?? "",
    description: task.description ?? "",
    priority: task.priority,
    category: (task as { category?: TaskCategory }).category ?? "document",
    deadline: task.deadline ?? "",
    primary_skill: (task.primary_skill as Skill) ?? "",
    secondary_skills: (task.secondary_skills as Skill[]) ?? [],
  };
}

/**
 * Parses a "yyyy-MM-dd" (or ISO) deadline as a LOCAL date. A bare
 * `new Date("2026-10-15")` is parsed as UTC and can land on the previous
 * day in timezones behind UTC, which causes off-by-one display/overdue bugs.
 */
function parseLocalDate(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00`);
}

/**
 * Declared at module level (not inside the component) so it isn't
 * recreated on every render.
 */
function MemberAvatar({
  member,
  className,
  textClassName,
}: {
  member: AssignableMember;
  className?: string;
  textClassName?: string;
}) {
  const name = `${member.first_name} ${member.last_name}`.trim();
  const initials =
    `${member.first_name?.[0] ?? ""}${member.last_name?.[0] ?? ""}` || "?";

  return (
    <Avatar
      title={name}
      className={cn(
        "size-8 border-2 border-gray-300 bg-primary dark:border-gray-600 dark:bg-gray-800",
        className,
      )}
    >
      <AvatarFallback
        className={cn(
          "rounded-full bg-primary text-10 font-bold uppercase text-primary-foreground dark:bg-gray-800 dark:text-foreground",
          textClassName,
        )}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

export interface EditTaskDialogProps {
  task: TaskResponseMembers;
  projectId: string;
  intent?: TaskIntent | null;
  onUpdated?: () => void;
  onDeleted?: () => void;
  trigger?: ReactNode;
  /** Optional controlled mode. When `open` is provided, no trigger is rendered. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function EditTaskDialog({
  task,
  projectId,
  intent,
  trigger,
  onUpdated,
  onDeleted,
  open: controlledOpen,
  onOpenChange,
}: EditTaskDialogProps) {
  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? controlledOpen : internalOpen;

  const setOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  const [taskForm, setTaskForm] = useState<TaskFormState>(() =>
    formStateFromTask(task),
  );

  /**
   * The member selection is stored as a list of project_members ids.
   * `null` means "the user hasn't touched it yet", in which case the
   * selection is whatever is currently assigned in the database. This
   * avoids any timing issue with data loading after the drawer opens.
   */
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[] | null>(
    null,
  );

  // Selected reviewer ID (only one allowed)
  // undefined = untouched (use DB value), null = explicitly cleared, string = chosen member_id
  const [selectedReviewerId, setSelectedReviewerId] = useState<
    string | null | undefined
  >(undefined);

  const [error, setError] = useState<string | null>(null);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [supertaskOpen, setSupertaskOpen] = useState(false);
  const [primarySkillOpen, setPrimarySkillOpen] = useState(false);
  const [secondarySkillOpen, setSecondarySkillOpen] = useState(false);
  const [assignedMembersOpen, setAssignedMembersOpen] = useState(false);
  const [reviewerOpen, setReviewerOpen] = useState(false);
  type IntentBanner = { tone: "suggestion" | "stale"; text: string };
  const [intentBanner, setIntentBanner] = useState<IntentBanner | null>(null);
  const [highlight, setHighlight] = useState<"deadline" | "members" | null>(
    null,
  );
  const intentAppliedRef = useRef(false);
  const deadlineFieldRef = useRef<HTMLDivElement>(null);
  const membersFieldRef = useRef<HTMLDivElement>(null);

  const updateTaskMutation = useUpdateTask();
  const createAssignedMemberMutation = useCreateAssignedMember();
  const deleteAssignedMemberMutation = useDeleteAssignedMember();
  const createAssignedReviewerMutation = useCreateAssignedReviewer();
  const updateAssignedReviewerMutation = useUpdateAssignedReviewer();
  const deleteAssignedReviewerMutation = useDeleteAssignedReviewer();
  const queryClient = useQueryClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Overdue indicator for the deadline field. Compared by calendar day, so a
  // task due today is NOT overdue; it becomes overdue tomorrow.
  const isTaskDone = false; // TODO: replace with your real check, e.g. task.status === "completed"
  const overdueDays = taskForm.deadline
    ? differenceInCalendarDays(today, parseLocalDate(taskForm.deadline))
    : 0;
  const isOverdue = !isTaskDone && overdueDays > 0;

  const { data: allAssignedMembers, isLoading: assignedLoading } =
    useGetAllAssignedMembers();

  // The real assignment rows for this task (source of truth for what's saved).
  const taskAssignmentRows = useMemo(
    () => (allAssignedMembers ?? []).filter((row) => row.task_id === task.id),
    [allAssignedMembers, task.id],
  );

  // Get current reviewer for this task
  const { data: taskReviewers = [], isLoading: reviewerLoading } =
    useGetTaskReviewers(task.id.toString());

  const {
    data: projectMembersData,
    isLoading: membersLoading,
    isError: membersError,
  } = useGetMembersWithUserInfo(projectId ?? "");

  const {
    data: projectSupertasks = [],
    isLoading: supertasksLoading,
    isError: supertasksError,
  } = useGetAllProjectSupertasks(projectId ?? "");

  const selectedSupertask = useMemo(
    () =>
      projectSupertasks.find(
        (supertask) => String(supertask.id) === taskForm.supertask_id,
      ) ?? null,
    [projectSupertasks, taskForm.supertask_id],
  );

  // Assignable members (member or leader roles for task assignment)
  const assignableMembers: AssignableMember[] = useMemo(() => {
    return (projectMembersData ?? [])
      .filter(
        (projectMember) =>
          (projectMember.project_role === "member" ||
            projectMember.project_role === "leader") &&
          projectMember.users,
      )
      .map((projectMember) => ({
        member_id: projectMember.id.toString(),
        id: projectMember.user_id,
        first_name: projectMember.users.first_name,
        last_name: projectMember.users.last_name,
      }));
  }, [projectMembersData]);

  // Eligible reviewers (leader, advisor, instructor roles)
  const eligibleReviewers: AssignableMember[] = useMemo(() => {
    return (projectMembersData ?? [])
      .filter(
        (projectMember) =>
          (projectMember.project_role === "leader" ||
            projectMember.project_role === "advisor" ||
            projectMember.project_role === "instructor") &&
          projectMember.users,
      )
      .map((projectMember) => ({
        member_id: projectMember.id.toString(),
        id: projectMember.user_id,
        first_name: projectMember.users.first_name,
        last_name: projectMember.users.last_name,
      }));
  }, [projectMembersData]);

  // Effective selection: user's edits if any, otherwise what's already saved.
  const currentSelectedIds: string[] = useMemo(
    () =>
      selectedMemberIds ??
      taskAssignmentRows.map((row) => String(row.member_id)),
    [selectedMemberIds, taskAssignmentRows],
  );

  const selectedMembers = useMemo(
    () =>
      assignableMembers.filter((member) =>
        currentSelectedIds.includes(member.member_id),
      ),
    [assignableMembers, currentSelectedIds],
  );

  const dbReviewerRow = taskReviewers[0];
  const dbReviewerMemberId = dbReviewerRow
    ? String(dbReviewerRow.member_id)
    : null;

  const effectiveReviewerId: string | null =
    selectedReviewerId === undefined ? dbReviewerMemberId : selectedReviewerId;

  const currentReviewer: AssignableMember | null = useMemo(() => {
    if (!effectiveReviewerId) return null;
    const member = projectMembersData?.find(
      (m) => m.id.toString() === effectiveReviewerId,
    );
    if (!member?.users) return null;
    return {
      member_id: member.id.toString(),
      id: member.user_id,
      first_name: member.users.first_name,
      last_name: member.users.last_name,
    };
  }, [projectMembersData, effectiveReviewerId]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    setError(null);

    if (nextOpen) {
      setTaskForm(formStateFromTask(task));
      setSelectedMemberIds(null);
      setSelectedReviewerId(undefined); // Reset reviewer selection when opening
      setSupertaskOpen(false);
    }
  };

  // Reset the form whenever the drawer opens (covers controlled mode,
  // where the parent flips `open` without going through handleOpenChange).
  // `task` is deliberately not a dependency so a background refetch
  // doesn't wipe in-progress edits.
  useEffect(() => {
    if (!open) return;
    setTaskForm(formStateFromTask(task));
    setSelectedMemberIds(null);
    setSelectedReviewerId(undefined);
    setSupertaskOpen(false);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) {
      intentAppliedRef.current = false;
      setIntentBanner(null);
      setHighlight(null);
      return;
    }
    if (!intent || intentAppliedRef.current) return;
    if (assignedLoading || membersLoading) return;

    intentAppliedRef.current = true;

    const nameOf = (id: string | null) => {
      const m = assignableMembers.find((x) => x.member_id === id);
      return m ? `${m.first_name} ${m.last_name}`.trim() : "this member";
    };
    const savedIds = taskAssignmentRows.map((r) => String(r.member_id));
    const stale = () =>
      setIntentBanner({
        tone: "stale",
        text: "This suggestion no longer matches the task (assignees or deadline changed since it was generated). Nothing was pre-filled.",
      });

    let target: "deadline" | "members" | null = null;

    switch (intent.kind) {
      case "reschedule": {
        const saved = task.deadline ? String(task.deadline).slice(0, 10) : null;
        if (intent.currentDeadline && saved !== intent.currentDeadline) {
          stale();
          break;
        }
        target = "deadline";
        if (!intent.suggestedDeadline) {
          setIntentBanner({
            tone: "suggestion",
            text: "This task has no deadline. Set one.",
          });
          break;
        }
        const suggested = intent.suggestedDeadline;
        setTaskForm((prev) => ({ ...prev, deadline: suggested }));
        const date = new Date(`${suggested}T00:00:00`);
        setIntentBanner({
          tone: "suggestion",
          text:
            `Suggested: move the deadline to ${format(date, "PPP")}` +
            (intent.extensionDays ? ` (+${intent.extensionDays} days).` : ".") +
            (date < today
              ? " That date has already passed, so pick a later one."
              : "") +
            " Review it, then press Save changes.",
        });
        break;
      }
      case "transfer": {
        const { fromMemberId: from, toMemberId: to } = intent;
        if (!from || !to || !savedIds.includes(from) || savedIds.includes(to)) {
          stale();
          break;
        }
        setSelectedMemberIds([...savedIds.filter((id) => id !== from), to]);
        setIntentBanner({
          tone: "suggestion",
          text: `Suggested: transfer this task from ${nameOf(from)} to ${nameOf(to)}. The assignees are updated below. Review them, then press Save changes.`,
        });
        target = "members";
        break;
      }
      case "share": {
        const to = intent.toMemberId;
        if (!to || savedIds.includes(to)) {
          stale();
          break;
        }
        setSelectedMemberIds([...savedIds, to]);
        setIntentBanner({
          tone: "suggestion",
          text: `Suggested: add ${nameOf(to)} as an assignee so the work is shared. Review it, then press Save changes.`,
        });
        target = "members";
        break;
      }
      case "split": {
        setIntentBanner({
          tone: "suggestion",
          text: `Suggested: split this task. ${nameOf(intent.toMemberId)} would take ${intent.recipientPoints ?? "part"} of its points. Splitting isn't automated: create a second task for them covering that part, then reduce this one.`,
        });
        target = "members";
        break;
      }
    }

    setHighlight(target);
    if (target) {
      const ref = target === "deadline" ? deadlineFieldRef : membersFieldRef;
      window.setTimeout(
        () =>
          ref.current?.scrollIntoView({ behavior: "smooth", block: "center" }),
        350,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    open,
    intent,
    assignedLoading,
    membersLoading,
    assignableMembers,
    taskAssignmentRows,
  ]);

  const undoSuggestion = () => {
    setTaskForm(formStateFromTask(task));
    setSelectedMemberIds(null);
    setHighlight(null);
    setIntentBanner(null);
  };

  const handleTaskDeleted = () => {
    // Close the drawer first so it isn't left open (or leaving a stuck
    // overlay behind) when the row, and this component, unmount.
    handleOpenChange(false);
    onDeleted?.();
  };

  const handleTaskFieldChange = <K extends keyof TaskFormState>(
    field: K,
    value: TaskFormState[K],
  ) => {
    setTaskForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSupertaskChange = (supertaskId: string | null) => {
    handleTaskFieldChange("supertask_id", supertaskId);
    setSupertaskOpen(false);
  };

  const handlePrimarySkillChange = (value: Skill) => {
    setTaskForm((prev) => ({
      ...prev,
      primary_skill: value,
      // If the newly picked primary skill was already chosen as a
      // secondary skill, drop it from secondary skills so a skill
      // can't be both primary and secondary at the same time.
      secondary_skills: prev.secondary_skills.filter(
        (skill) => skill !== value,
      ),
    }));
  };

  const toggleSecondarySkill = (skill: Skill) => {
    setTaskForm((prev) => {
      const exists = prev.secondary_skills.includes(skill);

      return {
        ...prev,
        secondary_skills: exists
          ? prev.secondary_skills.filter((s) => s !== skill)
          : [...prev.secondary_skills, skill],
      };
    });
  };

  const toggleAssignedMember = (member: AssignableMember) => {
    // Always start from the effective selection so existing assignees
    // are kept and the new pick is added on top of them.
    const base = currentSelectedIds;

    setSelectedMemberIds(
      base.includes(member.member_id)
        ? base.filter((id) => id !== member.member_id)
        : [...base, member.member_id],
    );
  };

  const toggleReviewer = (member: AssignableMember) => {
    setSelectedReviewerId(
      effectiveReviewerId === member.member_id ? null : member.member_id,
    );
  };

  const handleSubmit = async () => {
    setError(null);

    if (!task?.id) {
      setError("No task selected to edit.");
      return;
    }

    if (!taskForm.name.trim()) {
      setError("Task name is required.");
      return;
    }

    if (!taskForm.description.trim()) {
      setError("Description is required.");
      return;
    }

    if (!taskForm.deadline) {
      setError("Deadline is required.");
      return;
    }

    if (!taskForm.primary_skill) {
      setError("Primary skill is required.");
      return;
    }

    if (taskForm.secondary_skills.length === 0) {
      setError("At least one secondary skill is required.");
      return;
    }

    if (currentSelectedIds.length === 0) {
      setError("At least one assigned member is required.");
      return;
    }

    try {
      const originalSupertaskId = formStateFromTask(task).supertask_id;
      const supertaskChanged = originalSupertaskId !== taskForm.supertask_id;

      const payload: UpdateTask = {
        name: taskForm.name.trim(),
        description: taskForm.description.trim(),
        priority: taskForm.priority,
        category: taskForm.category,
        deadline: taskForm.deadline,
        primary_skill: taskForm.primary_skill as Skill,
        secondary_skills: taskForm.secondary_skills,
        // null explicitly removes the task from its supertask.
        supertask_id: taskForm.supertask_id,
      };

      await updateTaskMutation.mutateAsync({
        id: task.id,
        task: payload,
      });

      // Show the success toast as soon as the task is saved, so it still
      // appears even if syncing the reviewer or members fails afterwards.
      toast.success("Task updated successfully.");

      if (supertaskChanged) {
        queryClient.invalidateQueries({
          queryKey: supertaskKeys.listProject(projectId),
        });
      }

      // Compare by project_members id, as strings on both sides.
      const originalMemberIds = new Set(
        taskAssignmentRows.map((row) => String(row.member_id)),
      );
      const currentMemberIds = new Set(currentSelectedIds);

      const toAdd = currentSelectedIds.filter(
        (memberId) => !originalMemberIds.has(memberId),
      );

      const toRemove = taskAssignmentRows.filter(
        (row) => !currentMemberIds.has(String(row.member_id)),
      );

      let reviewerSyncFailed = false;
      if (dbReviewerMemberId !== effectiveReviewerId) {
        try {
          if (dbReviewerRow && effectiveReviewerId) {
            // reviewer changed: update the existing row
            await updateAssignedReviewerMutation.mutateAsync({
              id: dbReviewerRow.id,
              assignedReviewer: { member_id: effectiveReviewerId },
            });
          } else if (dbReviewerRow) {
            // reviewer cleared: delete by ROW id, not member_id
            await deleteAssignedReviewerMutation.mutateAsync(dbReviewerRow.id);
          } else if (effectiveReviewerId) {
            // no reviewer before, one chosen now
            await createAssignedReviewerMutation.mutateAsync({
              member_id: effectiveReviewerId,
              task_id: String(task.id),
            });
          }
        } catch (reviewerErr) {
          console.error("Failed to sync assigned reviewer", reviewerErr);
          const message =
            "Task was updated, but syncing the assigned reviewer failed. You can adjust it from the task detail page.";
          setError(message);
          toast.error(message);
          reviewerSyncFailed = true;
        }
      }

      let memberSyncFailed = false;
      if (toAdd.length > 0 || toRemove.length > 0) {
        try {
          await Promise.all([
            ...toAdd.map((memberId) =>
              createAssignedMemberMutation.mutateAsync({
                projectId: projectId,
                member: {
                  member_id: memberId,
                  task_id: task.id,
                },
              }),
            ),
            ...toRemove.map((row) =>
              deleteAssignedMemberMutation.mutateAsync({
                projectId: projectId,
                id: row.id,
              }),
            ),
          ]);
        } catch (assignErr) {
          console.error("Failed to sync assigned members", assignErr);
          const message =
            "Task was updated, but syncing assigned members failed. You can adjust them from the task detail page.";
          setError(message);
          toast.error(message);
          memberSyncFailed = true;
        } finally {
          // Invalidate assignment-related queries regardless of success or failure
          queryClient.invalidateQueries({
            queryKey: taskKeys.assignedMembers(projectId),
          });
          queryClient.invalidateQueries({
            queryKey: assignedMemberKeys.task_list(task.id),
          });
          queryClient.invalidateQueries({
            queryKey: assignedMemberKeys.list(),
          });
          queryClient.invalidateQueries({
            queryKey: projectKeys.detailSnapshot(projectId),
          });
        }

        // Always refresh the project task list and notify parent
        queryClient.invalidateQueries({
          queryKey: taskKeys.listProject(projectId),
        });
        onUpdated?.();
        if (!reviewerSyncFailed && !memberSyncFailed) {
          // Only close the drawer if both syncs succeeded
          handleOpenChange(false);
        }
        // If either sync failed, leave drawer open so user can see the error
      } else {
        // No assignment changes, just refresh the project task list
        queryClient.invalidateQueries({
          queryKey: taskKeys.listProject(projectId),
        });
        onUpdated?.();
        if (!reviewerSyncFailed) {
          handleOpenChange(false);
        }
        // If reviewerSyncFailed is true, leave drawer open so user can see the error
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong while updating this task.";
      setError(message);
      toast.error(message);
    }
  };

  const isSubmitting =
    updateTaskMutation.isPending ||
    createAssignedMemberMutation.isPending ||
    deleteAssignedMemberMutation.isPending ||
    createAssignedReviewerMutation.isPending ||
    updateAssignedReviewerMutation.isPending ||
    deleteAssignedReviewerMutation.isPending;

  return (
    <Drawer open={open} onOpenChange={handleOpenChange} direction="right">
      {!isControlled && (
        <DrawerTrigger asChild>
          {trigger ?? <Button variant="outline">Edit</Button>}
        </DrawerTrigger>
      )}

      <DrawerContent className="ml-auto h-full w-full overflow-hidden rounded-none p-0 sm:max-w-2xl">
        <DrawerHeader className="shrink-0 border-b px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DrawerTitle>Task</DrawerTitle>
              <DrawerDescription className="mt-1">
                View, Edit or Delete this task.
              </DrawerDescription>
            </div>

            <DrawerClose asChild>
              <button
                type="button"
                className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Close edit task"
              >
                <X className="size-4" />
              </button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        {/* min-h-0 + flex-1 lets this area scroll while the footer stays pinned */}
        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-6">
            {intentBanner && (
              <div
                className={cn(
                  "flex items-start gap-2 rounded-lg border p-3 text-sm",
                  intentBanner.tone === "stale"
                    ? "border-amber-500/50 bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-400"
                    : "border-primary/30 bg-primary/5 text-card-foreground",
                )}
              >
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="flex-1">{intentBanner.text}</p>
                {intentBanner.tone === "suggestion" && (
                  <button
                    type="button"
                    onClick={undoSuggestion}
                    className="shrink-0 text-xs underline"
                  >
                    Undo
                  </button>
                )}
              </div>
            )}
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="edit-task-name">Name</Label>

              <Input
                id="edit-task-name"
                placeholder="e.g. Set up auth routes"
                value={taskForm.name}
                onChange={(e) => handleTaskFieldChange("name", e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="edit-task-description">
                Description (required)
              </Label>

              <Textarea
                id="edit-task-description"
                rows={3}
                placeholder="What does this involve? Be as descriptive as possible"
                value={taskForm.description}
                onChange={(e) =>
                  handleTaskFieldChange("description", e.target.value)
                }
              />
            </div>

            {/* Same grid structure as AddTaskDialog */}
            <div className="grid gap-x-5 gap-y-6 sm:grid-cols-2">
              {/* Priority */}
              <div className="space-y-2">
                <Label>Priority</Label>

                <Popover open={priorityOpen} onOpenChange={setPriorityOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={priorityOpen}
                      className="justify-between text-left font-normal"
                    >
                      <span
                        className={cn(
                          "flex items-center gap-1.5",
                          !taskForm.priority && "text-muted-foreground",
                        )}
                      >
                        {taskForm.priority && (
                          <span
                            className={`size-1.5 rounded-full ${
                              priorityDotStyle[taskForm.priority]
                            }`}
                          />
                        )}
                        {PRIORITY_OPTIONS.find(
                          (option) => option.value === taskForm.priority,
                        )?.label ?? "Select priority"}
                      </span>

                      <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <div
                      className="max-h-64 overflow-y-auto overscroll-contain custom-scrollbar p-1"
                      onWheel={(e) => e.stopPropagation()}
                    >
                      {PRIORITY_OPTIONS.map((option) => {
                        const selected = taskForm.priority === option.value;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              handleTaskFieldChange("priority", option.value);
                              setPriorityOpen(false);
                            }}
                            className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                          >
                            <span className="flex items-center gap-1.5">
                              <span
                                className={`size-1.5 rounded-full ${
                                  priorityDotStyle[option.value]
                                }`}
                              />
                              {option.label}
                            </span>

                            {selected && (
                              <Check className="h-4 w-4 text-popover-foreground" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Supertask */}
              <div className="space-y-2">
                <Label>Supertask</Label>

                <Popover open={supertaskOpen} onOpenChange={setSupertaskOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={supertaskOpen}
                      disabled={!projectId || supertasksLoading}
                      className="w-full justify-between text-left font-normal"
                    >
                      <span
                        className={cn(
                          !selectedSupertask && "text-muted-foreground",
                        )}
                      >
                        {supertasksLoading
                          ? "Loading supertasks..."
                          : selectedSupertask
                            ? selectedSupertask.name
                            : "No supertask"}
                      </span>

                      <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <div
                      className="max-h-64 overflow-y-auto overscroll-contain custom-scrollbar p-1"
                      onWheel={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => handleSupertaskChange(null)}
                        className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                      >
                        <span>No supertask</span>

                        {!taskForm.supertask_id && (
                          <Check className="h-4 w-4 text-popover-foreground" />
                        )}
                      </button>

                      {supertasksError && (
                        <p className="px-2 py-2 text-sm text-rose-600">
                          Couldn't load supertasks.
                        </p>
                      )}

                      {!supertasksLoading &&
                        !supertasksError &&
                        projectSupertasks.length === 0 && (
                          <p className="px-2 py-2 text-sm text-neutral-500">
                            No supertasks created yet.
                          </p>
                        )}

                      {!supertasksError &&
                        projectSupertasks.map((supertask) => {
                          const selected =
                            String(supertask.id) === taskForm.supertask_id;

                          return (
                            <button
                              key={supertask.id}
                              type="button"
                              onClick={() =>
                                handleSupertaskChange(String(supertask.id))
                              }
                              className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                            >
                              <span>{supertask.name}</span>

                              {selected && (
                                <Check className="h-4 w-4 text-popover-foreground" />
                              )}
                            </button>
                          );
                        })}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Primary Skill */}
              <div className="space-y-2">
                <Label>Primary Skill</Label>

                <Popover
                  open={primarySkillOpen}
                  onOpenChange={setPrimarySkillOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={primarySkillOpen}
                      className="w-full justify-between text-left font-normal"
                    >
                      <span
                        className={cn(
                          !taskForm.primary_skill && "text-muted-foreground",
                        )}
                      >
                        {SKILL_OPTIONS.find(
                          (option) => option.value === taskForm.primary_skill,
                        )?.label ?? "Select skill"}
                      </span>

                      <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <div
                      className="max-h-64 overflow-y-auto overscroll-contain custom-scrollbar p-1"
                      onWheel={(e) => e.stopPropagation()}
                    >
                      {SKILL_OPTIONS.map((option) => {
                        const selected =
                          taskForm.primary_skill === option.value;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              handlePrimarySkillChange(option.value);
                              setPrimarySkillOpen(false);
                            }}
                            className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                          >
                            <span>{option.label}</span>

                            {selected && (
                              <Check className="h-4 w-4 text-popover-foreground" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Secondary Skill */}
              <div className="space-y-2">
                <Label>Secondary Skill</Label>

                <Popover
                  open={secondarySkillOpen}
                  onOpenChange={setSecondarySkillOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={secondarySkillOpen}
                      disabled={!taskForm.primary_skill}
                      className="w-full justify-between text-left font-normal"
                    >
                      <span
                        className={cn(
                          taskForm.secondary_skills.length === 0 &&
                            "text-muted-foreground",
                        )}
                      >
                        {!taskForm.primary_skill
                          ? "Select a primary skill first"
                          : taskForm.secondary_skills.length === 0
                            ? "Select skills"
                            : `${taskForm.secondary_skills.length} skill${
                                taskForm.secondary_skills.length > 1 ? "s" : ""
                              } selected`}
                      </span>
                      <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <div
                      className="max-h-64 overflow-y-auto overscroll-contain custom-scrollbar p-1"
                      onWheel={(e) => e.stopPropagation()}
                    >
                      {SKILL_OPTIONS.filter(
                        (option) => option.value !== taskForm.primary_skill,
                      ).map((option) => {
                        const selected = taskForm.secondary_skills.includes(
                          option.value,
                        );

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => toggleSecondarySkill(option.value)}
                            className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                          >
                            <span>{option.label}</span>

                            {selected && (
                              <Check className="h-4 w-4 text-popover-foreground" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>

                {taskForm.secondary_skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {taskForm.secondary_skills.map((skill) => (
                      <span
                        key={skill}
                        className="flex items-center gap-1 rounded-sm border border-[#7A0C2E]/20 bg-(--maroon) px-2 py-0.5 text-xs font-medium text-white"
                      >
                        {SKILL_OPTIONS.find((o) => o.value === skill)?.label}

                        <button
                          type="button"
                          onClick={() => toggleSecondarySkill(skill)}
                          className="rounded-full hover:bg-[#7A0C2E]/10"
                          aria-label={`Remove ${skill}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Assigned Members */}
              <div
                ref={membersFieldRef}
                className={cn(
                  "space-y-2",
                  highlight === "members" &&
                    "rounded-lg ring-2 ring-primary/40 ring-offset-4 ring-offset-background",
                )}
              >
                <Label className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  Assigned Members
                </Label>

                <Popover
                  open={assignedMembersOpen}
                  onOpenChange={setAssignedMembersOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={assignedMembersOpen}
                      disabled={!projectId || membersLoading || assignedLoading}
                      className="w-full justify-between text-left font-normal"
                    >
                      <span
                        className={cn(
                          currentSelectedIds.length === 0 &&
                            "text-muted-foreground",
                        )}
                      >
                        {membersLoading || assignedLoading
                          ? "Loading members..."
                          : currentSelectedIds.length === 0
                            ? "Select members"
                            : `${currentSelectedIds.length} member${
                                currentSelectedIds.length > 1 ? "s" : ""
                              } selected`}
                      </span>
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <div
                      className="max-h-64 overflow-y-auto overscroll-contain custom-scrollbar p-1"
                      onWheel={(e) => e.stopPropagation()}
                    >
                      {membersError && (
                        <p className="px-2 py-2 text-sm text-rose-600">
                          Couldn't load members.
                        </p>
                      )}

                      {!membersError &&
                        !membersLoading &&
                        assignableMembers.length === 0 && (
                          <p className="px-2 py-2 text-sm text-neutral-500">
                            No members with the "member" role on this project.
                          </p>
                        )}

                      {assignableMembers.map((member) => {
                        const selected = currentSelectedIds.includes(
                          member.member_id,
                        );

                        return (
                          <button
                            key={member.member_id}
                            type="button"
                            onClick={() => toggleAssignedMember(member)}
                            className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                          >
                            <div className="flex items-center gap-2">
                              <MemberAvatar member={member} />

                              <span>
                                {member.first_name} {member.last_name}
                              </span>
                            </div>

                            {selected && (
                              <Check className="h-4 w-4 text-popover-foreground" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>

                {selectedMembers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedMembers.map((member) => (
                      <span
                        key={member.member_id}
                        className="flex items-center gap-1.5 rounded-full border border-(--maroon)/20 bg-[#FBF3E7] py-0.5 pl-0.5 pr-2 text-xs text-[#231A2E] dark:bg-[#FBF3E7]/20 dark:text-[#FBF3E7]"
                      >
                        <MemberAvatar
                          member={member}
                          className="size-6"
                          textClassName="text-[9px]"
                        />
                        {member.first_name} {member.last_name}
                        <button
                          type="button"
                          onClick={() => toggleAssignedMember(member)}
                          className="rounded-full hover:bg-(--maroon)/10"
                          aria-label={`Remove ${member.first_name} ${member.last_name}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Select the members who will be assigned to this task.
                </p>
              </div>

              {/* Assigned Reviewer */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  Assigned Reviewer
                </Label>

                <Popover open={reviewerOpen} onOpenChange={setReviewerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={reviewerOpen}
                      disabled={
                        !projectId ||
                        membersLoading ||
                        assignedLoading ||
                        reviewerLoading
                      }
                      className="w-full justify-between text-left font-normal"
                    >
                      <span
                        className={cn(
                          !effectiveReviewerId && "text-muted-foreground",
                        )}
                      >
                        {membersLoading || assignedLoading || reviewerLoading
                          ? "Loading members..."
                          : !effectiveReviewerId
                            ? "Select reviewer"
                            : "1 reviewer selected"}
                      </span>
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <div
                      className="max-h-64 overflow-y-auto overscroll-contain custom-scrollbar p-1"
                      onWheel={(e) => e.stopPropagation()}
                    >
                      {membersError && (
                        <p className="px-2 py-2 text-sm text-rose-600">
                          Couldn't load members.
                        </p>
                      )}

                      {!membersError &&
                        !membersLoading &&
                        eligibleReviewers.length === 0 && (
                          <p className="px-2 py-2 text-sm text-neutral-500">
                            No eligible reviewers (leader, advisor, instructor)
                            on this project.
                          </p>
                        )}

                      {eligibleReviewers.map((member) => {
                        const selected =
                          effectiveReviewerId === member.member_id;

                        return (
                          <button
                            key={member.member_id}
                            type="button"
                            onClick={() => toggleReviewer(member)}
                            className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                          >
                            <div className="flex items-center gap-2">
                              <MemberAvatar member={member} />

                              <span>
                                {member.first_name} {member.last_name}
                              </span>
                            </div>

                            {selected && (
                              <Check className="h-4 w-4 text-popover-foreground" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>

                {currentReviewer && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span
                      key={currentReviewer.member_id}
                      className="flex items-center gap-1.5 rounded-full border border-(--maroon)/20 bg-[#FBF3E7] py-0.5 pl-0.5 pr-2 text-xs text-[#231A2E] dark:bg-[#FBF3E7]/20 dark:text-[#FBF3E7]"
                    >
                      <MemberAvatar
                        member={currentReviewer}
                        className="size-6"
                        textClassName="text-[9px]"
                      />
                      {currentReviewer.first_name} {currentReviewer.last_name}
                      <button
                        type="button"
                        onClick={() => toggleReviewer(currentReviewer)}
                        className="rounded-full hover:bg-(--maroon)/10"
                        aria-label={`Remove ${currentReviewer.first_name} ${currentReviewer.last_name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Select the reviewer for this task (leader, advisor, or
                  instructor only).
                </p>
              </div>

              {/* Deadline */}
              <div
                ref={deadlineFieldRef}
                className={cn(
                  "space-y-2",
                  highlight === "deadline" &&
                    "rounded-lg ring-2 ring-primary/40 ring-offset-4 ring-offset-background",
                )}
              >
                <Label
                  className={cn(
                    "flex items-center gap-1.5",
                    isOverdue && "text-red-600 dark:text-red-400",
                  )}
                >
                  Deadline 
                  {isOverdue && (
                    <span
                      role="img"
                      aria-label="Overdue"
                      title="Overdue"
                      className="inline-flex"
                    >
                      <AlertCircle className="h-4 w-4" aria-hidden="true" />
                    </span>
                  )}
                </Label>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !taskForm.deadline && "text-muted-foreground",
                        isOverdue &&
                          "border-red-500 text-red-700 hover:text-red-700 focus-visible:ring-red-500/30 dark:border-red-500/70 dark:text-red-400 dark:hover:text-red-400",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />

                      {taskForm.deadline
                        ? format(parseLocalDate(taskForm.deadline), "PPP")
                        : "Pick a date"}
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={
                        taskForm.deadline
                          ? parseLocalDate(taskForm.deadline)
                          : undefined
                      }
                      onSelect={(date) => {
                        handleTaskFieldChange(
                          "deadline",
                          date ? format(date, "yyyy-MM-dd") : "",
                        );
                      }}
                      disabled={{ before: today }}
                    />
                  </PopoverContent>
                </Popover>

                {isOverdue && (
                  <p
                    className="text-xs font-medium text-red-600 dark:text-red-400"
                    role="status"
                  >
                    Overdue by {overdueDays} day{overdueDays > 1 ? "s" : ""}.
                    Set a new deadline to reschedule.
                  </p>
                )}
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            )}

            <TaskRevisionNotes taskId={task.id} />

            {/* Attachments: saved immediately, independent of "Save changes" */}
            <div className="border-t pt-6">
              <TaskAttachments taskId={task.id} />
            </div>

            {/* Links */}
            <div className="border-t pt-6">
              <TaskLinks taskId={task.id} />
            </div>

            {/* Comments: saved immediately, independent of "Save changes" */}
            <div className="border-t pt-6">
              <TaskComments taskId={task.id} />
            </div>
          </div>
        </div>

        <DrawerFooter className="shrink-0 flex-row items-center justify-between gap-2 border-t bg-muted/40 px-6 py-3">
          {/* Delete lives here now; it has its own confirm dialog. */}
          <DeleteTaskDialog
            task={task}
            projectId={projectId}
            onDeleted={handleTaskDeleted}
            trigger={
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isSubmitting}
              >
                Delete
              </Button>
            }
          />

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>

            <Button
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                assignedLoading ||
                membersLoading ||
                reviewerLoading
              }
            >
              {isSubmitting ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}