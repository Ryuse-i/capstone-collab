import { useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarIcon, Check, ChevronDown, Users, X } from "lucide-react";
import { format } from "date-fns";

import { useUpdateTask, taskKeys } from "@/hooks/useTask";
import { useGetMembersWithUserInfo } from "@/hooks/useProjectMember";
import {
  useGetTaskMembers,
  useGetAllAssignedMembers,
  useCreateAssignedMember,
  useDeleteAssignedMember,
  assignedMemberKeys,
} from "@/hooks/useAssignedMember";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
 * Mirrors AddTaskDialog's AssignableMember shape — member_id is the
 * project_members row id, which is what actually gets persisted /
 * FK-checked on the backend. `id` (the user id) is kept only for
 * display/avatar-initial purposes — do NOT use it for equality checks
 * against assigned members.
 */
type AssignableMember = {
  member_id: string;
  id: string;
  first_name: string;
  last_name: string;
};

type TaskFormState = {
  name: string;
  description: string;
  priority: TaskPriority;
  category: TaskCategory;
  deadline: string;
  primary_skill: Skill | "";
  secondary_skills: Skill[];
  assigned_members: AssignableMember[];
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
  { value: "Iot Development", label: "IoT Development" },
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

// NOTE: `member.member_id` below assumes useGetTaskMembers's return type
// exposes a `member_id` field (the project_members row id) alongside
// `id`/`first_name`/`last_name`, matching AddTaskDialog's convention.
// I haven't seen that hook's actual return type — if it doesn't have
// member_id (e.g. it's nested under a joined `project_member` object,
// or absent entirely), this mapping and the `assigned_members` fallback
// below both need adjusting to match its real shape.
function formStateFromTask(
  task: TaskResponseMembers,
  assignedMembers?: AssignableMember[],
): TaskFormState {
  return {
    name: task.name ?? "",
    description: task.description ?? "",
    priority: task.priority,
    category: (task as { category?: TaskCategory }).category ?? "document",
    deadline: task.deadline ?? "",
    primary_skill: (task.primary_skill as Skill) ?? "",
    secondary_skills: (task.secondary_skills as Skill[]) ?? [],
    assigned_members:
      assignedMembers ??
      (task.assigned_members ?? []).map((member) => ({
        member_id: (member as { member_id?: string }).member_id ?? "",
        id: member.id,
        first_name: member.first_name,
        last_name: member.last_name,
      })),
  };
}

export interface EditTaskDialogProps {
  task: TaskResponseMembers;
  projectId: string;
  onUpdated?: () => void;
  trigger?: ReactNode;
}

export default function EditTaskDialog({
  task,
  projectId,
  trigger,
  onUpdated,
}: EditTaskDialogProps) {
  const [open, setOpen] = useState(false);

  const [taskForm, setTaskForm] = useState<TaskFormState>(() =>
    formStateFromTask(task),
  );

  const [error, setError] = useState<string | null>(null);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [primarySkillOpen, setPrimarySkillOpen] = useState(false);
  const [secondarySkillOpen, setSecondarySkillOpen] = useState(false);
  const [assignedMembersOpen, setAssignedMembersOpen] = useState(false);

  const updateTaskMutation = useUpdateTask();
  const createAssignedMemberMutation = useCreateAssignedMember();
  const deleteAssignedMemberMutation = useDeleteAssignedMember();
  const queryClient = useQueryClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: currentAssignedMembers, isLoading: currentMembersLoading } =
    useGetTaskMembers(open ? task.id : "");

  const { data: allAssignedMembers } = useGetAllAssignedMembers();

  const taskAssignmentRows = useMemo(
    () => (allAssignedMembers ?? []).filter((row) => row.task_id === task.id),
    [allAssignedMembers, task.id],
  );

  const {
    data: projectMembersData,
    isLoading: membersLoading,
    isError: membersError,
  } = useGetMembersWithUserInfo(projectId ?? "");

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

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    setError(null);

    if (nextOpen) {
      const liveMembers =
        currentAssignedMembers?.map((member) => ({
          member_id: (member as { member_id?: string }).member_id ?? "",
          id: member.id,
          first_name: member.first_name,
          last_name: member.last_name,
        })) ?? [];

      setTaskForm(
        formStateFromTask(
          task,
          liveMembers.length > 0
            ? liveMembers
            : (task.assigned_members ?? []).map((member) => ({
                member_id: (member as { member_id?: string }).member_id ?? "",
                id: member.id,
                first_name: member.first_name,
                last_name: member.last_name,
              })),
        ),
      );
    }
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
    setTaskForm((prev) => {
      const exists = prev.assigned_members.some(
        (assigned) =>
          (assigned.member_id && assigned.member_id === member.member_id) ||
          assigned.id === member.id,
      );

      return {
        ...prev,
        assigned_members: exists
          ? prev.assigned_members.filter(
              (assigned) =>
                !(
                  (assigned.member_id &&
                    assigned.member_id === member.member_id) ||
                  assigned.id === member.id
                ),
            )
          : [...prev.assigned_members, member],
      };
    });
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

    if (taskForm.assigned_members.length === 0) {
      setError("At least one assigned member is required.");
      return;
    }

    try {
      const payload: UpdateTask = {
        name: taskForm.name.trim(),
        description: taskForm.description.trim(),
        priority: taskForm.priority,
        category: taskForm.category,
        deadline: taskForm.deadline,
        primary_skill: taskForm.primary_skill as Skill,
        secondary_skills: taskForm.secondary_skills,
      };

      await updateTaskMutation.mutateAsync({
        id: task.id,
        task: payload,
      });

      const originalMemberIds = new Set(
        taskAssignmentRows.map((row) => row.member_id),
      );

      const currentMemberIds = new Set(
        taskForm.assigned_members.map((member) => member.member_id),
      );

      const toAdd = taskForm.assigned_members.filter(
        (member) => !originalMemberIds.has(member.member_id),
      );

      const toRemove = taskAssignmentRows.filter(
        (row) => !currentMemberIds.has(row.member_id),
      );

      if (toAdd.length > 0 || toRemove.length > 0) {
        try {
          await Promise.all([
            ...toAdd.map((member) =>
              createAssignedMemberMutation.mutateAsync({
                member_id: member.member_id,
                task_id: task.id,
              }),
            ),
            ...toRemove.map((row) =>
              deleteAssignedMemberMutation.mutateAsync(row.id),
            ),
          ]);

          queryClient.invalidateQueries({
            queryKey: assignedMemberKeys.task_list(task.id),
          });

          queryClient.invalidateQueries({
            queryKey: assignedMemberKeys.list(),
          });
        } catch (assignErr) {
          console.error("Failed to sync assigned members", assignErr);

          setError(
            "Task was updated, but syncing assigned members failed. You can adjust them from the task detail page.",
          );

          // Some adds/removes in the Promise.all may have already
          // succeeded before the failure — refresh assignment-related
          // caches too, not just the task list, so anything that did
          // go through isn't left stale.
          queryClient.invalidateQueries({
            queryKey: assignedMemberKeys.task_list(task.id),
          });

          queryClient.invalidateQueries({
            queryKey: assignedMemberKeys.list(),
          });

          queryClient.invalidateQueries({
            queryKey: taskKeys.byProject(projectId),
          });

          onUpdated?.();
          handleOpenChange(false);
          return;
        }
      }

      queryClient.invalidateQueries({
        queryKey: taskKeys.byProject(projectId),
      });

      onUpdated?.();
      handleOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while updating this task.",
      );
    }
  };

  const isSubmitting =
    updateTaskMutation.isPending ||
    createAssignedMemberMutation.isPending ||
    deleteAssignedMemberMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? <Button variant="outline">Edit</Button>}
      </DialogTrigger>

      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
      >
        {/* Header */}
        <DialogHeader className="shrink-0 border-b px-6 py-5">
          <DialogTitle>Edit task</DialogTitle>
          <DialogDescription>Update the details below.</DialogDescription>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="custom-scrollbar overflow-y-auto px-6 py-6">
          <div className="space-y-6">
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
                            className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-neutral-100"
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
                              <Check className="h-4 w-4 text-[#7A0C2E]" />
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
                            className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-neutral-100"
                          >
                            <span>{option.label}</span>

                            {selected && (
                              <Check className="h-4 w-4 text-[#7A0C2E]" />
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
                            className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-neutral-100"
                          >
                            <span>{option.label}</span>

                            {selected && (
                              <Check className="h-4 w-4 text-[#7A0C2E]" />
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
                        className="flex items-center gap-1 rounded-full border border-[#7A0C2E]/20 bg-[#FBF3E7] px-2 py-0.5 text-xs text-[#231A2E]"
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
              <div className="space-y-2">
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
                      disabled={
                        !projectId || membersLoading || currentMembersLoading
                      }
                      className="w-full justify-between text-left font-normal"
                    >
                      <span
                        className={cn(
                          taskForm.assigned_members.length === 0 &&
                            "text-muted-foreground",
                        )}
                      >
                        {membersLoading || currentMembersLoading
                          ? "Loading members..."
                          : taskForm.assigned_members.length === 0
                            ? "Select members"
                            : `${taskForm.assigned_members.length} member${
                                taskForm.assigned_members.length > 1 ? "s" : ""
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
                        const selected = taskForm.assigned_members.some(
                          (assigned) =>
                            (assigned.member_id &&
                              assigned.member_id === member.member_id) ||
                            assigned.id === member.id,
                        );

                        return (
                          <button
                            key={member.member_id}
                            type="button"
                            onClick={() => toggleAssignedMember(member)}
                            className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-neutral-100"
                          >
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FBF3E7] text-xs font-medium text-[#7A0C2E]">
                                {member.first_name?.charAt(0)}
                                {member.last_name?.charAt(0)}
                              </div>

                              <span>
                                {member.first_name} {member.last_name}
                              </span>
                            </div>

                            {selected && (
                              <Check className="h-4 w-4 text-[#7A0C2E]" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>

                {taskForm.assigned_members.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {taskForm.assigned_members.map((member) => (
                      <span
                        key={member.member_id}
                        className="flex items-center gap-1 rounded-full border border-[#7A0C2E]/20 bg-[#FBF3E7] px-2 py-0.5 text-xs text-[#231A2E]"
                      >
                        {member.first_name} {member.last_name}
                        <button
                          type="button"
                          onClick={() => toggleAssignedMember(member)}
                          className="rounded-full hover:bg-[#7A0C2E]/10"
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

              {/* Deadline */}
              <div className="space-y-2">
                <Label>Deadline (required)</Label>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !taskForm.deadline && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />

                      {taskForm.deadline
                        ? format(new Date(taskForm.deadline), "PPP")
                        : "Pick a date"}
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={
                        taskForm.deadline
                          ? new Date(taskForm.deadline)
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
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="shrink-0 gap-2 border-t bg-muted/40 px-6 py-2 pb-6">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>

          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
