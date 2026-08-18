import { useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarIcon, Check, Gauge, Users, X } from "lucide-react";
import { format } from "date-fns";
import { useUpdateTask, taskKeys } from "@/hooks/useTask";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  TaskResponseMembers,
  TaskCategory,
  TaskPriority,
  TaskComplexity,
  UpdateTask,
} from "@/types/task";
import type { UserBase } from "@/types/user";
// NOTE: complexity is intentionally NOT part of the editable payload.
// It is AI-scored on the backend.

type AssignedMember = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
};

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

const complexityPillStyle: Record<TaskComplexity, string> = {
  high: "bg-red-50 text-red-600",
  medium: "bg-yellow-50 text-yellow-600",
  low: "bg-indigo-50 text-indigo-600",
};

function formStateFromTask(task: TaskResponseMembers): TaskFormState {
  return {
    name: task.name ?? "",
    description: task.description ?? "",
    priority: task.priority,
    category: (task as { category?: TaskCategory }).category ?? "document",
    deadline: task.deadline ?? "",
    primary_skill: (task.primary_skill as Skill) ?? "",
    secondary_skills: (task.secondary_skills as Skill[]) ?? [],
    assigned_members: task.assigned_members ?? [],
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
  const [secondarySkillOpen, setSecondarySkillOpen] = useState(false);
  const [assignedMembersOpen, setAssignedMembersOpen] = useState(false);

  const updateTaskMutation = useUpdateTask();
  const queryClient = useQueryClient();

  /*
   * Replace this with however you currently retrieve the members
   * of the project.
   *
   * Example:
   *
   * const { data: projectMembers = [] } = useGetProjectMembers(projectId);
   *
   * For now this assumes you have a `projectMembers` array available.
   */

  const projectMembers: AssignedMember[] = [];

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (nextOpen) {
      setTaskForm(formStateFromTask(task));
    }

    setError(null);
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
        deadline: new Date(taskForm.deadline).toISOString(),
        primary_skill: taskForm.primary_skill as Skill,
        secondary_skills: taskForm.secondary_skills,
      };

      await updateTaskMutation.mutateAsync({
        id: task.id,
        task: payload,
      });

      queryClient.invalidateQueries({
        queryKey: taskKeys.listProject(projectId),
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

  const isSubmitting = updateTaskMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? <Button variant="outline">Edit</Button>}
      </DialogTrigger>

      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="max-h-[80vh] overflow-y-auto custom-scrollbar sm:max-w-2xl p-4"
      >
        <DialogHeader>
          <DialogTitle>Edit task</DialogTitle>

          <DialogDescription>
            Update the details below. Complexity is scored automatically and
            can't be edited directly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 no-scrollbar">
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

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Priority */}
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

            {/* Complexity */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-muted-foreground">
                <Gauge className="h-3.5 w-3.5" />
                Complexity
              </Label>

              <div className="flex h-9 items-center rounded-md border border-neutral-200 bg-neutral-50 px-3">
                {task.complexity ? (
                  <Badge
                    className={`border-0 font-medium ${
                      complexityPillStyle[task.complexity]
                    }`}
                  >
                    {task.complexity.charAt(0).toUpperCase() +
                      task.complexity.slice(1)}
                  </Badge>
                ) : (
                  <span className="text-sm text-neutral-400">
                    Not yet scored
                  </span>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Complexity is scored automatically and updates when skills or
                description change.
              </p>
            </div>

            {/* Primary Skill */}
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

            {/* Secondary Skills */}
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
                      className="flex items-center gap-1 rounded-full bg-[#FBF3E7] border border-[#7A0C2E]/20 px-2 py-0.5 text-xs text-[#231A2E]"
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
                        date ? date.toISOString() : "",
                      );
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Assigned Members */}
            <div className="space-y-2 sm:col-span-2">
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
                    {projectMembers.length === 0 ? (
                      <p className="px-2 py-3 text-sm text-muted-foreground">
                        No project members available.
                      </p>
                    ) : (
                      projectMembers.map((member) => {
                        const selected = taskForm.assigned_members.some(
                          (assigned) => assigned.id === member.id,
                        );

                        return (
                          <button
                            key={member.id}
                            type="button"
                            onClick={() => toggleAssignedMember(member)}
                            className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-neutral-100"
                          >
                            <span>
                              {member.first_name + " " + member.last_name}
                            </span>

                            {selected && (
                              <Check className="h-4 w-4 text-[#7A0C2E]" />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {taskForm.assigned_members.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {taskForm.assigned_members.map((member) => (
                    <span
                      key={member.id}
                      className="flex items-center gap-1 rounded-full bg-[#FBF3E7] border border-[#7A0C2E]/20 px-2 py-0.5 text-xs text-[#231A2E]"
                    >
                      {member.first_name + " " + member.last_name}

                      <button
                        type="button"
                        onClick={() => toggleAssignedMember(member)}
                        className="rounded-full hover:bg-[#7A0C2E]/10"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

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
            {isSubmitting ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
