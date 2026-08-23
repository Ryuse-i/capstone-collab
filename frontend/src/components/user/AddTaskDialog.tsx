import { useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarIcon, Check, Layers, ListTodo, Users, X } from "lucide-react";
import { format } from "date-fns";
import { useCurrentUser } from "@/hooks/useAuth";
import { useCreateTask } from "@/hooks/useTask";
import { useGetMembersWithUserInfo } from "@/hooks/useProjectMember";
import {
  useCreateAssignedMember,
  assignedMemberKeys,
} from "@/hooks/useAssignedMember";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  CreateTask as CreateTaskPayload,
  TaskCategory,
  TaskPriority,
} from "@/types/task";
import { taskKeys } from "@/hooks/useTask";

type TaskType = "task" | "supertask";

/**
 * Local shape used for the "Assigned Members" picker.
 *
 * `id` here is the project member's `user_id` (NOT the project_member row id),
 * since that's what you'll eventually want to persist against the task.
 * Swap this out for your real `CreateAssignedMember` type once that hook exists —
 * at that point just map `assigned_members.map(m => m.id)` into the payload
 * you actually send to the API.
 */
type AssignableMember = {
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

type SupertaskFormState = {
  name: string;
  description: string;
  deadline: string;
};

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const SKILL_OPTIONS: { value: Skill; label: string }[] = [
  { value: "Backend Development", label: "Backend Development" },
  { value: "Frontend Development", label: "Frontend Development" },
  { value: "Mobile Development", label: "Mobile Development" },
  { value: "Iot Development", label: "IoT Development" },
  { value: "Database Design", label: "Database Design" },
  { value: "System Architecture", label: "System Architecture" },
  { value: "Ui/Ux Design", label: "UI/UX Design" },
  { value: "Testing and Quality Assurance", label: "Testing and QA" },
  { value: "Literature Review", label: "Literature Review" },
  { value: "Data Collection", label: "Data Collection" },
  {
    value: "Survey and Questionnaire Design",
    label: "Survey/Questionnaire Design",
  },
  { value: "Interview and Observation", label: "Interview and Observation" },
  { value: "Data Analysis", label: "Data Analysis" },
  { value: "Technical Writing", label: "Technical Writing" },
  { value: "Documentation", label: "Documentation" },
  { value: "Diagram and Modeling", label: "Diagram and Modeling" },
  { value: "Editing and Proofreading", label: "Editing and Proofreading" },
  { value: "Financial Documentation", label: "Financial Documentation" },
  { value: "Budget Planning", label: "Budget Planning" },
  { value: "Resource Management", label: "Resource Management" },
];

const initialTaskForm: TaskFormState = {
  name: "",
  description: "",
  priority: "medium",
  category: "document",
  deadline: "",
  primary_skill: "",
  secondary_skills: [],
  assigned_members: [],
};

const initialSupertaskForm: SupertaskFormState = {
  name: "",
  description: "",
  deadline: "",
};

export interface AddTaskDialogProps {
  projectId?: string;
  onCreated?: () => void;
  trigger?: ReactNode;
}

export function AddTaskDialog({
  projectId,
  trigger,
  onCreated,
}: AddTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [taskType, setTaskType] = useState<TaskType>("task");
  const [taskForm, setTaskForm] = useState<TaskFormState>(initialTaskForm);
  const [supertaskForm, setSupertaskForm] =
    useState<SupertaskFormState>(initialSupertaskForm);
  const [error, setError] = useState<string | null>(null);
  const [secondarySkillOpen, setSecondarySkillOpen] = useState(false);
  const [assignedMembersOpen, setAssignedMembersOpen] = useState(false);

  const createTaskMutation = useCreateTask();
  const createAssignedMemberMutation = useCreateAssignedMember();
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Only fetch once we actually have a project to scope the members to,
  // and only while the dialog is open (no point fetching in the background).
  const {
    data: projectMembersData,
    isLoading: membersLoading,
    isError: membersError,
  } = useGetMembersWithUserInfo(projectId ?? "");

  // Only show project members whose role is exactly "member" — leaders,
  // advisors, instructors, and admins are excluded from assignment.
  const assignableMembers: AssignableMember[] = useMemo(() => {
    return (projectMembersData ?? [])
      .filter(
        (projectMember) =>
          projectMember.project_role === "member" && projectMember.users,
      )
      .map((projectMember) => ({
        id: projectMember.user_id,
        first_name: projectMember.users.first_name,
        last_name: projectMember.users.last_name,
      }));
  }, [projectMembersData]);
  const resetForms = () => {
    setTaskForm(initialTaskForm);
    setSupertaskForm(initialSupertaskForm);
    setTaskType("task");
    setError(null);
    setAssignedMembersOpen(false);
    setSecondarySkillOpen(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (!nextOpen) {
      resetForms();
    }
  };

  const handleTaskFieldChange = <K extends keyof TaskFormState>(
    field: K,
    value: TaskFormState[K],
  ) => {
    setTaskForm((prev) => ({ ...prev, [field]: value }));
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
        (assigned) => assigned.id === member.id,
      );

      return {
        ...prev,
        assigned_members: exists
          ? prev.assigned_members.filter(
              (assigned) => assigned.id !== member.id,
            )
          : [...prev.assigned_members, member],
      };
    });
  };

  const handleSupertaskFieldChange = (
    field: keyof SupertaskFormState,
    value: string,
  ) => {
    setSupertaskForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setError(null);

    if (!projectId?.trim()) {
      setError("Project ID is required to create this task.");
      return;
    }

    if (taskType === "task") {
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

      if (!user?.id) {
        setError("Could not determine the current user. Please sign in again.");
        return;
      }
    }

    if (taskType === "supertask") {
      if (!supertaskForm.name.trim()) {
        setError("Supertask name is required.");
        return;
      }

      if (!supertaskForm.description.trim()) {
        setError("Supertask description is required.");
        return;
      }
    }

    try {
      if (taskType === "task") {
        const payload: CreateTaskPayload = {
          project_id: projectId.trim(),
          name: taskForm.name.trim(),
          description: taskForm.description.trim(),
          created_by: user!.id,
          priority: taskForm.priority,
          category: taskForm.category,
          deadline: new Date(taskForm.deadline).toISOString(),
          primary_skill: taskForm.primary_skill as Skill,
          secondary_skills: taskForm.secondary_skills,
        };

        const createdTask = await createTaskMutation.mutateAsync(payload);

        queryClient.invalidateQueries({
          queryKey: taskKeys.byProject(projectId),
        });

        if (taskForm.assigned_members.length > 0) {
          try {
            await Promise.all(
              taskForm.assigned_members.map((member) =>
                createAssignedMemberMutation.mutateAsync({
                  user_id: member.id,
                  task_id: createdTask.id,
                }),
              ),
            );

            queryClient.invalidateQueries({
              queryKey: assignedMemberKeys.task_list(createdTask.id),
            });
          } catch (assignErr) {
            // The task itself was created successfully — don't roll that
            // back, just surface that assignment partially/fully failed.
            console.error("Failed to assign one or more members", assignErr);
            setError(
              "Task was created, but assigning some members failed. You can add them from the task detail page.",
            );
            onCreated?.();
            handleOpenChange(false);
            return;
          }
        }
      } else {
        console.log("creating supertask:", {
          project_id: projectId.trim(),
          name: supertaskForm.name.trim(),
          description: supertaskForm.description.trim(),
          deadline: supertaskForm.deadline
            ? new Date(supertaskForm.deadline).toISOString()
            : null,
        });
      }

      onCreated?.();

      handleOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while creating this item.",
      );
    }
  };

  const isSubmitting =
    createTaskMutation.isPending || createAssignedMemberMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? <Button>+ Add Task</Button>}
      </DialogTrigger>

      <DialogContent className="max-h-[80vh] overflow-y-auto custom-scrollbar sm:max-w-2xl p-4">
        <DialogHeader>
          <DialogTitle>Create item for this project</DialogTitle>

          <DialogDescription>
            Supertasks are milestones. Tasks are the individual units of work
            that actually drive project progress.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 no-scrollbar">
          <div>
            <Label className="mb-2 block text-sm font-semibold text-[#231A2E]">
              What are you creating?
            </Label>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTaskType("task")}
                className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                  taskType === "task"
                    ? "border-[#7A0C2E] bg-[#FBF3E7]"
                    : "border-neutral-200 bg-white hover:border-neutral-300"
                }`}
              >
                <ListTodo className="mt-0.5 h-5 w-5 text-[#7A0C2E]" />

                <div>
                  <p className="text-sm font-semibold text-[#231A2E]">Task</p>

                  <p className="text-xs text-neutral-500">
                    A concrete, trackable unit of work.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTaskType("supertask")}
                className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                  taskType === "supertask"
                    ? "border-[#7A0C2E] bg-[#FBF3E7]"
                    : "border-neutral-200 bg-white hover:border-neutral-300"
                }`}
              >
                <Layers className="mt-0.5 h-5 w-5 text-[#C9A84C]" />

                <div>
                  <p className="text-sm font-semibold text-[#231A2E]">
                    Supertask
                  </p>

                  <p className="text-xs text-neutral-500">
                    A milestone that groups related tasks.
                  </p>
                </div>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="item-name">Name</Label>

            <Input
              id="item-name"
              placeholder={
                taskType === "task"
                  ? "e.g. Set up auth routes"
                  : "e.g. MVP backend complete"
              }
              value={taskType === "task" ? taskForm.name : supertaskForm.name}
              onChange={(e) =>
                taskType === "task"
                  ? handleTaskFieldChange("name", e.target.value)
                  : handleSupertaskFieldChange("name", e.target.value)
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="item-description">Description (required)</Label>

            <Textarea
              id="item-description"
              rows={3}
              placeholder="What does this involve? Be as descriptive as possible"
              value={
                taskType === "task"
                  ? taskForm.description
                  : supertaskForm.description
              }
              onChange={(e) =>
                taskType === "task"
                  ? handleTaskFieldChange("description", e.target.value)
                  : handleSupertaskFieldChange("description", e.target.value)
              }
            />
          </div>

          {taskType === "task" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Priority</Label>

                <Select
                  value={taskForm.priority}
                  onValueChange={(value) =>
                    handleTaskFieldChange("priority", value as TaskPriority)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>

                  <SelectContent>
                    {PRIORITY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Primary Skill</Label>

                <Select
                  value={taskForm.primary_skill}
                  onValueChange={(value) =>
                    handleTaskFieldChange("primary_skill", value as Skill)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select skill" />
                  </SelectTrigger>

                  <SelectContent>
                    {SKILL_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
                  <div className="flex flex-wrap gap-1.5">
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
                      disabled={!projectId || membersLoading}
                      className="w-full justify-between text-left font-normal"
                    >
                      <span
                        className={cn(
                          taskForm.assigned_members.length === 0 &&
                            "text-muted-foreground",
                        )}
                      >
                        {membersLoading
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
                          (assigned) => assigned.id === member.id,
                        );

                        return (
                          <button
                            key={member.id}
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
                  <div className="flex flex-wrap gap-1.5">
                    {taskForm.assigned_members.map((member) => (
                      <span
                        key={member.id}
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
                          date ? date.toISOString() : "",
                        );
                      }}
                      disabled={{ before: today }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="supertask-deadline">Deadline</Label>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !supertaskForm.deadline && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />

                    {supertaskForm.deadline
                      ? format(new Date(supertaskForm.deadline), "PPP")
                      : "Pick a date"}
                  </Button>
                </PopoverTrigger>

                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={
                      supertaskForm.deadline
                        ? new Date(supertaskForm.deadline)
                        : undefined
                    }
                    onSelect={(date) => {
                      handleSupertaskFieldChange(
                        "deadline",
                        date ? date.toISOString() : "",
                      );
                    }}
                    disabled={{ before: today }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="mt-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>

          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting
              ? "Creating..."
              : taskType === "task"
                ? "Create task"
                : "Create supertask"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
