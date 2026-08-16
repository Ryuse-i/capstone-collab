import { useState, type ReactNode } from "react";
import { CalendarIcon, Check, Layers, ListTodo, X } from "lucide-react";
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
import type {
  CreateTask as CreateTaskPayload,
  TaskCategory,
  TaskPriority,
} from "@/types/task";

type TaskType = "task" | "supertask";

type TaskFormState = {
  name: string;
  description: string;
  priority: TaskPriority;
  category: TaskCategory;
  deadline: string;
  Primaryskill: Skill | "";
  Secondaryskill: Skill[];
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
  { value: "Backend Developoment", label: "Backend Development" },
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
  Primaryskill: "",
  Secondaryskill: [],
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

export default function AddTaskDialog({
  projectId,
  onCreated,
  trigger,
}: AddTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [taskType, setTaskType] = useState<TaskType>("task");
  const [taskForm, setTaskForm] = useState<TaskFormState>(initialTaskForm);
  const [supertaskForm, setSupertaskForm] =
    useState<SupertaskFormState>(initialSupertaskForm);
  const [error, setError] = useState<string | null>(null);
  const [primarySkillOpen, setPrimarySkillOpen] = useState(false);
  const [secondarySkillOpen, setSecondarySkillOpen] = useState(false);

  const createTaskMutation = useCreateTask();
  const { data: user } = useCurrentUser();

  const resetForms = () => {
    setTaskForm(initialTaskForm);
    setSupertaskForm(initialSupertaskForm);
    setTaskType("task");
    setError(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) resetForms();
  };

  const handleTaskFieldChange = <K extends keyof TaskFormState>(
    field: K,
    value: TaskFormState[K],
  ) => {
    setTaskForm((prev) => ({ ...prev, [field]: value }));
  };

  // When the primary skill changes, strip it out of any existing
  // secondary skill selection so state never holds the same skill twice.
  const handlePrimarySkillChange = (value: Skill) => {
    setTaskForm((prev) => ({
      ...prev,
      Primaryskill: value,
      Secondaryskill: prev.Secondaryskill.filter((s) => s !== value),
    }));
  };

  const toggleSecondarySkill = (skill: Skill) => {
    setTaskForm((prev) => {
      const exists = prev.Secondaryskill.includes(skill);
      return {
        ...prev,
        Secondaryskill: exists
          ? prev.Secondaryskill.filter((s) => s !== skill)
          : [...prev.Secondaryskill, skill],
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
      if (!taskForm.Primaryskill) {
        setError("Primary skill is required.");
        return;
      }
      if (taskForm.Secondaryskill.length === 0) {
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
          Primaryskill: taskForm.Primaryskill as Skill,
          Secondaryskill: taskForm.Secondaryskill,
        };

        await createTaskMutation.mutateAsync(payload);
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
            <Label className="mb-2 block text-sm font-semibold text-[#231A2E] dark:text-foreground">
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
                          !taskForm.Primaryskill && "text-muted-foreground",
                        )}
                      >
                        {taskForm.Primaryskill
                          ? SKILL_OPTIONS.find(
                              (o) => o.value === taskForm.Primaryskill,
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
                      {SKILL_OPTIONS.map((option) => {
                        const selected =
                          option.value === taskForm.Primaryskill;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              handlePrimarySkillChange(option.value);
                              setPrimarySkillOpen(false);
                            }}
                            className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-neutral-100 dark:hover:bg-(--semi-card)"
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
                      disabled={!taskForm.Primaryskill}
                      className="w-full justify-between text-left font-normal"
                    >
                      <span
                        className={cn(
                          taskForm.Secondaryskill.length === 0 &&
                            "text-muted-foreground",
                        )}
                      >
                        {!taskForm.Primaryskill
                          ? "Select a primary skill first"
                          : taskForm.Secondaryskill.length === 0
                            ? "Select skills"
                            : `${taskForm.Secondaryskill.length} skill${taskForm.Secondaryskill.length > 1 ? "s" : ""} selected`}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <div
                      className="max-h-64 overflow-y-auto overscroll-contain custom-scrollbar p-1"
                      onWheel={(e) => e.stopPropagation()}
                    >
                      {SKILL_OPTIONS.filter(
                        (option) => option.value !== taskForm.Primaryskill,
                      ).map((option) => {
                        const selected = taskForm.Secondaryskill.includes(
                          option.value,
                        );
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => toggleSecondarySkill(option.value)}
                            className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-neutral-100 dark:hover:bg-(--semi-card)"
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
                {taskForm.Secondaryskill.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {taskForm.Secondaryskill.map((skill) => (
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