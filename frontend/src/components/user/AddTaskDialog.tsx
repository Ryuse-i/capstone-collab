import { useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarIcon, Check, Layers, ListTodo, Users, X } from "lucide-react";
import { format } from "date-fns";
import { useCurrentUser } from "@/hooks/useAuth";
import { useCreateTask } from "@/hooks/useTask";
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
import type { UserBase } from "@/types/user";
import type {
  CreateTask as CreateTaskPayload,
  TaskCategory,
  TaskPriority,
} from "@/types/task";
import { projectKeys } from "@/hooks/useProject";

type TaskType = "task" | "supertask";

type TaskFormState = {
  name: string;
  description: string;
  priority: TaskPriority;
  category: TaskCategory;
  deadline: string;
  primary_skill: Skill | "";
  secondary_skills: Skill[];
  assigned_members: UserBase[];
};

type SupertaskFormState = {
  name: string;
  description: string;
  deadline: string;
};

const PRIORITY_OPTIONS: {
  value: TaskPriority;
  label: string;
  color: string;
}[] = [
  { value: "low", label: "Low", color: "#9ca3af" },
  { value: "medium", label: "Medium", color: "#eab308" },
  { value: "high", label: "High", color: "#ef4444" },
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

/*
 * Temporary mock members.
 *
 * Replace this later with your project-members hook.
 */
const MOCK_MEMBERS: UserBase[] = [
  {
    id: "member-1",
    first_name: "John",
    last_name: "Montes",
  } as UserBase,
  {
    id: "member-2",
    first_name: "Clarisa",
    last_name: "Paule",
  } as UserBase,
  {
    id: "member-3",
    first_name: "Rommel",
    last_name: "Magsino",
  } as UserBase,
  {
    id: "member-4",
    first_name: "Dylan",
    last_name: "Mangaoang",
  } as UserBase,
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
  const [primarySkillOpen, setPrimarySkillOpen] = useState(false);
  const [secondarySkillOpen, setSecondarySkillOpen] = useState(false);
  const [assignedMembersOpen, setAssignedMembersOpen] = useState(false);

  const createTaskMutation = useCreateTask();
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();

  const resetForms = () => {
    setTaskForm(initialTaskForm);
    setSupertaskForm(initialSupertaskForm);
    setTaskType("task");
    setError(null);
    setPrimarySkillOpen(false);
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
    setPrimarySkillOpen(false);
  };

  const clearPrimarySkill = () => {
    setTaskForm((prev) => ({ ...prev, primary_skill: "" }));
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

  const toggleAssignedMember = (member: UserBase) => {
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

        await createTaskMutation.mutateAsync(payload);

        queryClient.invalidateQueries({
          queryKey: projectKeys.detailSnapshot(projectId),
        });

        /*
         * Assigned members are intentionally NOT sent yet.
         *
         * Later, when you create the separate assigned-member hook,
         * you can use:
         *
         * taskForm.assigned_members.map((member) => member.id)
         *
         * to create the rows in the task_assigned_members table.
         */
        console.log(
          "Selected assigned members:",
          taskForm.assigned_members.map((member) => member.id),
        );
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

  const isSubmitting = createTaskMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? <Button>+ Add Task</Button>}
      </DialogTrigger>

      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden bg-card p-0 sm:max-w-2xl">
        {/* Header */}
        <DialogHeader className="shrink-0 border-b px-6 py-5">
          <DialogTitle>Create item for this project</DialogTitle>

          <DialogDescription>
            Supertasks are milestones. Tasks are the individual units of work
            that actually drive project progress.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="custom-scrollbar overflow-y-auto px-6 py-6">
          <div className="space-y-6">
            <div>
              <Label className="mb-2 block text-sm font-semibold text-foreground">
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
                    <p className="text-sm font-semibold text-[#231A2E]">
                      Task
                    </p>

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
                value={
                  taskType === "task" ? taskForm.name : supertaskForm.name
                }
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
                    : handleSupertaskFieldChange(
                        "description",
                        e.target.value,
                      )
                }
              />
            </div>

            {taskType === "task" ? (
              <div className="grid gap-x-5 gap-y-6 sm:grid-cols-2">
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
                          <span className="flex items-center gap-2">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: option.color }}
                            />
                            {option.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                          {taskForm.primary_skill
                            ? SKILL_OPTIONS.find(
                                (o) => o.value === taskForm.primary_skill,
                              )?.label
                            : "Select skill"}
                        </span>
                      </Button>
                    </PopoverTrigger>

                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <div
                        className="max-h-64 overflow-y-auto overscroll-contain custom-scrollbar p-1"
                        onWheel={(e) => e.stopPropagation()}
                      >
                        {SKILL_OPTIONS.filter(
                          (option) =>
                            !taskForm.secondary_skills.includes(option.value),
                        ).map((option) => {
                          const selected =
                            taskForm.primary_skill === option.value;

                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() =>
                                handlePrimarySkillChange(option.value)
                              }
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

                  {taskForm.primary_skill && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="flex items-center gap-1 rounded-full border border-[#7A0C2E]/20 bg-[#FBF3E7] px-2 py-0.5 text-xs text-[#231A2E]">
                        {
                          SKILL_OPTIONS.find(
                            (o) => o.value === taskForm.primary_skill,
                          )?.label
                        }

                        <button
                          type="button"
                          onClick={clearPrimarySkill}
                          className="rounded-full hover:bg-[#7A0C2E]/10"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    </div>
                  )}
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
                                  taskForm.secondary_skills.length > 1
                                    ? "s"
                                    : ""
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
                              onClick={() =>
                                toggleSecondarySkill(option.value)
                              }
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
                        className="w-full justify-between text-left font-normal"
                      >
                        <span
                          className={cn(
                            taskForm.assigned_members.length === 0 &&
                              "text-muted-foreground",
                          )}
                        >
                          {taskForm.assigned_members.length === 0
                            ? "Select members"
                            : `${taskForm.assigned_members.length} member${
                                taskForm.assigned_members.length > 1
                                  ? "s"
                                  : ""
                              } selected`}
                        </span>
                      </Button>
                    </PopoverTrigger>

                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <div
                        className="max-h-64 overflow-y-auto overscroll-contain custom-scrollbar p-1"
                        onWheel={(e) => e.stopPropagation()}
                      >
                        {MOCK_MEMBERS.map((member) => {
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
                    <div className="flex flex-wrap gap-1.5 pt-1">
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