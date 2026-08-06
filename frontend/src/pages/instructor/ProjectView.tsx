import { useState } from "react";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Files,
  FolderKanban,
  Gauge,
  Layers,
  ListTodo,
  Target,
  Users,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import AppLayout from "@/layouts/Applayout";
import { Badge } from "@/components/ui/badge";
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
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useGetOneProjectWithSpanshot } from "@/hooks/useProject";
import { useGetAllTask, useCreateTask, useDeleteTask } from "@/hooks/useTask";
import { useCurrentUser } from "@/hooks/useAuth";
import type {
  CreateTask as CreateTaskPayload,
  TaskResponse,
  TaskStatus,
  TaskPriority,
  TaskCategory,
  TaskComplexity,
} from "@/types/task";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {format} from "date-fns"
import { CalendarIcon } from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { cn } from "@/lib/utils";

type ProjectViewTab = "overview" | "tasks" | "members" | "resources";

const tabs: { id: ProjectViewTab; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <Activity className="h-4 w-4" /> },
  { id: "tasks", label: "Tasks", icon: <Target className="h-4 w-4" /> },
  { id: "members", label: "Members", icon: <Users className="h-4 w-4" /> },
  { id: "resources", label: "Resources", icon: <Files className="h-4 w-4" /> },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const CATEGORY_OPTIONS: { value: TaskCategory; label: string }[] = [
  { value: "document", label: "Document" },
  { value: "research", label: "Research" },
  { value: "development", label: "Development" },
];

type TaskType = "task" | "supertask";

type TaskFormState = {
  name: string;
  description: string;
  priority: TaskPriority;
  category: TaskCategory;
  deadline: string;
};

type SupertaskFormState = {
  name: string;
  description: string;
  deadline: string;
};

const initialTaskForm: TaskFormState = {
  name: "",
  description: "",
  priority: "medium",
  category: "document",
  deadline: "",
};

const initialSupertaskForm: SupertaskFormState = {
  name: "",
  description: "",
  deadline: "",
};

interface CreateTaskProps {
  projectId: string;
  onCreated?: () => void;
}

const CreateTask = ({ projectId, onCreated }: CreateTaskProps) => {
  const [open, setOpen] = useState(false);
  const [taskType, setTaskType] = useState<TaskType>("task");
  const [taskForm, setTaskForm] = useState<TaskFormState>(initialTaskForm);
  const [supertaskForm, setSupertaskForm] =
    useState<SupertaskFormState>(initialSupertaskForm);
  const [error, setError] = useState<string | null>(null);

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

  const handleSupertaskFieldChange = (
    field: keyof SupertaskFormState,
    value: string,
  ) => {
    setSupertaskForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setError(null);

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
          project_id: projectId,
          name: taskForm.name.trim(),
          description: taskForm.description.trim(),
          created_by: user!.id,
          priority: taskForm.priority,
          category: taskForm.category,
          deadline: new Date(taskForm.deadline).toISOString(),
        };

        await createTaskMutation.mutateAsync(payload);
      } else {
        const payload = {
          project_id: projectId,
          name: supertaskForm.name.trim(),
          description: supertaskForm.description.trim(),
          deadline: supertaskForm.deadline
            ? new Date(supertaskForm.deadline).toISOString()
            : null,
        };

        console.log("creating supertask:", payload);
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
        <Button>+ Add Task</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create item for this project</DialogTitle>
          <DialogDescription>
            Supertasks are milestones. Tasks are the individual units of work
            that actually drive project progress.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 no-scrollbar">
          {/* Type selector */}
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

          {/* Shared: name */}
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

          {/* Shared: description (required for both) */}
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
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={taskForm.priority}
                    onValueChange={(v) =>
                      handleTaskFieldChange("priority", v as TaskPriority)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={taskForm.category}
                    onValueChange={(v) =>
                      handleTaskFieldChange("category", v as TaskCategory)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="task-deadline">Deadline (required)</Label>
                  <Input
                    id="task-deadline"
                    type="datetime-local"
                    value={taskForm.deadline}
                    onChange={(e) =>
                      handleTaskFieldChange("deadline", e.target.value)
                    }
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="supertask-deadline">Deadline</Label>
              <Input
                id="supertask-deadline"
                type="datetime-local"
                value={supertaskForm.deadline}
                onChange={(e) =>
                  handleSupertaskFieldChange("deadline", e.target.value)
                }
              />
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
};

function getHealthClasses(status?: string) {
  switch (status) {
    case "healthy":
      return "bg-emerald-100 text-emerald-700";
    case "at_risk":
      return "bg-amber-100 text-amber-700";
    case "critical":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-neutral-100 text-neutral-700";
  }
}

function formatNumber(value?: number, digits = 1) {
  if (typeof value !== "number" || Number.isNaN(value) || value === 0) {
    return "None";
  }
  return value.toFixed(digits);
}

function formatCount(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value) || value === 0) {
    return "None";
  }
  return `${value}`;
}

function formatPercentage(value?: number, digits = 1) {
  const formatted = formatNumber(value, digits);
  return formatted === "None" ? "None" : `${formatted}%`;
}

// Keys match TaskStatus / TaskPriority / TaskComplexity exactly now.
const statusStyle: Record<TaskStatus, string> = {
  completed: "bg-green-100 text-green-700",
  submitted: "bg-yellow-100 text-yellow-700",
  "in-progress": "bg-blue-100 text-blue-700",
  not_started: "bg-gray-100 text-gray-500",
};

const priorityStyle: Record<TaskPriority, string> = {
  high: "bg-red-100 text-red-600",
  medium: "bg-yellow-100 text-yellow-600",
  low: "bg-gray-100 text-gray-500",
};

const complexityStyle: Record<TaskComplexity, string> = {
  high: "bg-red-100 text-red-600",
  medium: "bg-yellow-100 text-yellow-600",
  low: "bg-gray-100 text-gray-500",
};

export default function ProjectView() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<ProjectViewTab>("overview");

  const projectId = id ?? "";
  const {
    data: project,
    isLoading,
    isError,
  } = useGetOneProjectWithSpanshot(projectId);
  const snapshot = project?.snapshot;

  // ---- Tasks: live data ----
  const {
    data: allTasksData,
    isLoading: isTasksLoading,
    isError: isTasksError,
  } = useGetAllTask();

  // Filter client-side to this project until/unless the API supports
  // a project_id query param on GET /tasks.
  const filteredTasks = (allTasksData ?? []).filter(
    (t) => t.project_id === projectId,
  );

  const deleteTaskMutation = useDeleteTask();

  const handleDeleteTask = (taskId: string) => {
    if (!confirm("Delete this task? This can't be undone.")) return;
    deleteTaskMutation.mutate(taskId);
  };

  const [selectedTask, setSelectedTask] = useState<TaskResponse | null>(null);
  const [openTaskDialog, setOpenTaskDialog] = useState(false);

  const overviewCards = [
    {
      label: "Progress",
      value: formatPercentage(snapshot?.progress_percentage),
      caption: `Expected ${formatPercentage(snapshot?.expected_percentage)}`,
      icon: <Gauge className="h-4 w-4 text-[#7A0C2E]" />,
    },
    {
      label: "Health",
      value: snapshot?.health_status
        ? snapshot.health_status.replace(/_/g, " ")
        : "Unknown",
      caption: `Score ${formatNumber(snapshot?.health_score)}`,
      icon: <Activity className="h-4 w-4 text-[#C9A84C]" />,
    },
    {
      label: "Completed tasks",
      value: formatCount(snapshot?.completed_tasks),
      caption: "Tasks completed",
      icon: <FolderKanban className="h-4 w-4 text-[#3F3350]" />,
    },
    {
      label: "Workload balance",
      value: formatPercentage(snapshot?.workload_balance),
      caption: snapshot?.imbalance_severity ?? "No severity data",
      icon: <BarChart3 className="h-4 w-4 text-[#7A0C2E]" />,
    },
  ];

  if (isLoading) {
    return (
      <AppLayout breadcrumbs={[{ label: "Projects", href: "/project-list" }]}>
        <div className="min-h-screen w-full px-4 py-6">
          <button
            onClick={() => navigate("/project-list")}
            className="mb-4 flex items-center gap-2 text-sm font-medium text-[#7A0C2E]"
          >
            <ArrowLeft size={16} />
            Back to projects
          </button>
          <Card className="border border-neutral-200 p-6 text-sm text-neutral-500">
            Loading project details...
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (isError || !project) {
    return (
      <AppLayout breadcrumbs={[{ label: "Projects", href: "/project-list" }]}>
        <div className="min-h-screen w-full px-4 py-6">
          <button
            onClick={() => navigate("/project-list")}
            className="mb-4 flex items-center gap-2 text-sm font-medium text-[#7A0C2E]"
          >
            <ArrowLeft size={16} />
            Back to projects
          </button>
          <Card className="border border-neutral-200 p-6">
            <h1 className="text-xl font-semibold text-[#231A2E]">
              Project not found
            </h1>
            <p className="mt-2 text-sm text-neutral-500">
              The requested project could not be loaded right now.
            </p>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const renderTaskTableBody = () => {
    if (isTasksLoading) {
      return (
        <TableRow>
          <TableCell
            colSpan={7}
            className="py-8 text-center text-muted-foreground"
          >
            Loading tasks...
          </TableCell>
        </TableRow>
      );
    }

    if (isTasksError) {
      return (
        <TableRow>
          <TableCell colSpan={7} className="py-8 text-center text-rose-600">
            Failed to load tasks.
          </TableCell>
        </TableRow>
      );
    }

    if (filteredTasks.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={7} className="py-12 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FBF3E7]">
                <ListTodo className="h-6 w-6 text-[#7A0C2E]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#231A2E]">
                  No tasks yet
                </p>
                <p className="mt-1 text-sm text-neutral-500">
                  Let's start by creating one.
                </p>
              </div>
              <CreateTask projectId={projectId} />
            </div>
          </TableCell>
        </TableRow>
      );
    }

    return filteredTasks.map((task) => (
      <TableRow key={task.id}>
        <TableCell className="font-medium text-[#231A2E]">
          {task.name}
        </TableCell>
        <TableCell>
          <Badge
            className={`${statusStyle[task.status ?? "not_started"]} border-0`}
          >
            {(task.status ?? "not_started").replace(/[-_]/g, " ")}
          </Badge>
        </TableCell>
        <TableCell>
          <Badge className={`${priorityStyle[task.priority]} border-0`}>
            {task.priority}
          </Badge>
        </TableCell>
        <TableCell>
          {/* TODO: render assigned member avatars once TaskResponse includes assignees */}
          <span className="text-xs text-neutral-400">—</span>
        </TableCell>
        <TableCell className="text-muted-foreground">
          {task.deadline
            ? new Date(task.deadline).toLocaleDateString()
            : "No deadline"}
        </TableCell>
        <TableCell>
          {task.complexity ? (
            <Badge className={`${complexityStyle[task.complexity]} border-0`}>
              {task.complexity}
            </Badge>
          ) : (
            <span className="text-xs text-neutral-400">—</span>
          )}
        </TableCell>
        <TableCell>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedTask(task);
                setOpenTaskDialog(true);
              }}
            >
              View
            </Button>
            <Button variant="outline" size="sm">
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={
                deleteTaskMutation.isPending &&
                deleteTaskMutation.variables === task.id
              }
              onClick={() => handleDeleteTask(task.id)}
            >
              {deleteTaskMutation.isPending &&
              deleteTaskMutation.variables === task.id
                ? "Deleting..."
                : "Delete"}
            </Button>
          </div>
        </TableCell>
      </TableRow>
    ));
  };

  return (
    <AppLayout breadcrumbs={[{ label: "Projects", href: "/project-list" }]}>
      <div className="min-h-screen w-full px-4 py-6">
        <button
          onClick={() => navigate("/project-list")}
          className="mb-5 flex items-center gap-2 text-sm font-medium text-[#7A0C2E]"
        >
          <ArrowLeft size={16} />
          Back to projects
        </button>
        <Card className="overflow-hidden border border-neutral-200 shadow-sm">
          <div className="border-b border-neutral-200 bg-[#FBF3E7] p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#C9A84C]">
                  Project snapshot
                </p>
                <h1 className="mt-2 text-2xl font-bold text-[#231A2E]">
                  {project.name}
                </h1>
                <p className="mt-3 max-w-2xl text-sm text-neutral-600">
                  {project.description}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${getHealthClasses(snapshot?.health_status)}`}
                >
                  {snapshot?.health_status
                    ? snapshot.health_status.replace(/_/g, " ")
                    : "Unknown"}
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-[#7A0C2E] shadow-sm">
                  {formatPercentage(snapshot?.progress_percentage)} progress
                </span>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? "default" : "outline"}
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.icon}
                  {tab.label}
                </Button>
              ))}
            </div>

            {activeTab === "overview" && (
              <div className="mt-6 space-y-6">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {overviewCards.map((card) => (
                    <div
                      key={card.label}
                      className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4"
                    >
                      <div className="flex items-center gap-2 text-sm font-semibold text-[#231A2E]">
                        {card.icon}
                        {card.label}
                      </div>
                      <p className="mt-3 text-2xl font-bold text-[#231A2E]">
                        {card.value}
                      </p>
                      <p className="mt-1 text-sm text-neutral-500">
                        {card.caption}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Card className="border border-neutral-200 p-4">
                    <h2 className="text-lg font-semibold text-[#231A2E]">
                      Details
                    </h2>
                    <div className="mt-4 space-y-3 text-sm text-neutral-600">
                      <div className="flex justify-between gap-3">
                        <span>Expected score</span>
                        <span className="font-semibold text-[#231A2E]">
                          {formatNumber(snapshot?.expected_score)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span>Workload points</span>
                        <span className="font-semibold text-[#231A2E]">
                          {formatNumber(snapshot?.total_workload_points, 0)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span>Average workload</span>
                        <span className="font-semibold text-[#231A2E]">
                          {formatNumber(snapshot?.avg_workload)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span>Schedule variance</span>
                        <span className="font-semibold text-[#231A2E]">
                          {formatNumber(snapshot?.schedule_variance)}
                        </span>
                      </div>
                    </div>
                  </Card>

                  <Card className="border border-neutral-200 p-4">
                    <h2 className="text-lg font-semibold text-[#231A2E]">
                      Project contacts
                    </h2>
                    <div className="mt-4 space-y-3 text-sm text-neutral-600">
                      <div className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2">
                        <span>Project owner</span>
                        <span className="font-semibold text-[#231A2E]">
                          {project.created_by}
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2">
                        <span>Instructor</span>
                        <span className="font-semibold text-[#231A2E]">
                          {project.instructor ?? "Not assigned"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2">
                        <span>Advisor</span>
                        <span className="font-semibold text-[#231A2E]">
                          {project.advisor ?? "Not assigned"}
                        </span>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === "tasks" && (
              <>
                <div className="mt-6 space-y-6">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <Card className="border border-neutral-200 p-4">
                      <div className="flex items-center gap-2 text-lg font-semibold text-[#231A2E]">
                        <Target className="h-5 w-5 text-[#7A0C2E]" />
                        Task progress
                      </div>
                      <div className="mt-4 space-y-3 text-sm text-neutral-600">
                        <div className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2">
                          <span>Completed tasks</span>
                          <span className="font-semibold text-[#231A2E]">
                            {formatCount(snapshot?.completed_tasks)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2">
                          <span>Expected score</span>
                          <span className="font-semibold text-[#231A2E]">
                            {formatNumber(snapshot?.expected_score)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2">
                          <span>Schedule variance</span>
                          <span className="font-semibold text-[#231A2E]">
                            {formatNumber(snapshot?.schedule_variance)}
                          </span>
                        </div>
                      </div>
                    </Card>

                    <Card className="border border-neutral-200 p-4">
                      <div className="flex items-center gap-2 text-lg font-semibold text-[#231A2E]">
                        <CalendarDays className="h-5 w-5 text-[#C9A84C]" />
                        Timeline insight
                      </div>
                      <p className="mt-4 text-sm text-neutral-600">
                        This project is tracking{" "}
                        {formatPercentage(snapshot?.progress_percentage)} of its
                        expected progress and is currently marked as{" "}
                        {snapshot?.health_status ?? "unknown"}.
                      </p>
                    </Card>
                  </div>

                  <div className="flex w-full justify-end">
                    {filteredTasks.length > 0 && (
                      <CreateTask projectId={projectId} />
                    )}
                  </div>

                  <Card className="p-0 border border-neutral-200">
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Task</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Priority</TableHead>
                            <TableHead>Assigned</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead>Complexity</TableHead>
                            <TableHead className="w-40">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>{renderTaskTableBody()}</TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>

                <Dialog
                  open={openTaskDialog}
                  onOpenChange={(open) => {
                    if (!open) {
                      setSelectedTask(null);
                    }
                    setOpenTaskDialog(open);
                  }}
                >
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Task details</DialogTitle>
                      <DialogDescription>
                        {selectedTask
                          ? selectedTask.name
                          : "Select a task to view details."}
                      </DialogDescription>
                    </DialogHeader>

                    {selectedTask ? (
                      <div className="space-y-3 text-sm text-neutral-600">
                        <div className="rounded-lg bg-neutral-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                            Status
                          </p>
                          <Badge
                            className={`mt-2 border-0 ${statusStyle[selectedTask.status ?? "not_started"]}`}
                          >
                            {(selectedTask.status ?? "not_started").replace(
                              /[-_]/g,
                              " ",
                            )}
                          </Badge>
                        </div>
                        <div className="rounded-lg bg-neutral-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                            Priority
                          </p>
                          <p className="mt-2 font-semibold text-[#231A2E]">
                            {selectedTask.priority}
                          </p>
                        </div>
                        <div className="rounded-lg bg-neutral-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                            Due date
                          </p>
                          <p className="mt-2 font-semibold text-[#231A2E]">
                            {selectedTask.deadline
                              ? new Date(selectedTask.deadline).toLocaleString()
                              : "No deadline"}
                          </p>
                        </div>
                      </div>
                    ) : null}

                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline">Close</Button>
                      </DialogClose>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            )}

            {activeTab === "members" && (
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <Card className="border border-neutral-200 p-4">
                  <div className="flex items-center gap-2 text-lg font-semibold text-[#231A2E]">
                    <Users className="h-5 w-5 text-[#3F3350]" />
                    Assigned members
                  </div>
                  <div className="mt-4 space-y-3 text-sm text-neutral-600">
                    <div className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2">
                      <span>Owner</span>
                      <span className="font-semibold text-[#231A2E]">
                        {project.created_by}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2">
                      <span>Instructor</span>
                      <span className="font-semibold text-[#231A2E]">
                        {project.instructor ?? "Not assigned"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2">
                      <span>Advisor</span>
                      <span className="font-semibold text-[#231A2E]">
                        {project.advisor ?? "Not assigned"}
                      </span>
                    </div>
                  </div>
                </Card>

                <Card className="border border-neutral-200 p-4">
                  <h2 className="text-lg font-semibold text-[#231A2E]">
                    Team status
                  </h2>
                  <p className="mt-4 text-sm text-neutral-600">
                    Member details can be expanded here as the project grows.
                    For now, the view highlights the assigned instructor,
                    advisor, and project owner from the project record.
                  </p>
                </Card>
              </div>
            )}

            {activeTab === "resources" && (
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <Card className="border border-neutral-200 p-4">
                  <div className="flex items-center gap-2 text-lg font-semibold text-[#231A2E]">
                    <Files className="h-5 w-5 text-[#7A0C2E]" />
                    Project resources
                  </div>
                  <div className="mt-4 space-y-3 text-sm text-neutral-600">
                    <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 p-4 text-center">
                      No project resources have been added yet.
                    </div>
                  </div>
                </Card>

                <Card className="border border-neutral-200 p-4">
                  <h2 className="text-lg font-semibold text-[#231A2E]">
                    Snapshot summary
                  </h2>
                  <div className="mt-4 space-y-3 text-sm text-neutral-600">
                    <div className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2">
                      <span>Average workload</span>
                      <span className="font-semibold text-[#231A2E]">
                        {formatNumber(snapshot?.avg_workload)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2">
                      <span>Workload balance</span>
                      <span className="font-semibold text-[#231A2E]">
                        {formatPercentage(snapshot?.workload_balance)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2">
                      <span>Severity</span>
                      <span className="font-semibold text-[#231A2E]">
                        {snapshot?.imbalance_severity ?? "Not set"}
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
