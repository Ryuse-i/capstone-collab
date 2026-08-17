import { useState } from "react";
import AppLayout from "@/layouts/Applayout";
import {
  AlertTriangle,
  CheckSquare,
  Eye,
  Clock,
  XSquare,
  BarChart2,
  PlusCircle,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AddTaskDialog from "@/components/user/AddTaskDialog";
import type {
  TaskComplexity,
  TaskPriority,
  TaskStatus,
  TaskResponse,
} from "@/types/task";
import { useGetAllProjectTask } from "@/hooks/useTask";
import { useCurrentUser } from "@/hooks/useAuth";
import { useGetCurrentProject } from "@/hooks/useProject";
import { useGetOneProjectWithSpanshot } from "@/hooks/useProject";

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

// Option lists for the faceted filters (dot color mirrors the badge palette)

const statusOptions = [
  { label: "Completed", value: "completed", color: "#22c55e" },
  { label: "Submitted", value: "submitted", color: "#eab308" },
  { label: "In Progress", value: "in-progress", color: "#3b82f6" },
  { label: "Not Started", value: "not_started", color: "#9ca3af" },
];

const priorityOptions = [
  { label: "High", value: "high", color: "#ef4444" },
  { label: "Medium", value: "medium", color: "#eab308" },
  { label: "Low", value: "low", color: "#9ca3af" },
];

const complexityOptions = [
  { label: "High", value: "high", color: "#ef4444" },
  { label: "Medium", value: "medium", color: "#eab308" },
  { label: "Low", value: "low", color: "#9ca3af" },
];

// ---- Board view: Supertask -> Task grouping (MOCK DATA ONLY, not wired to backend) ----
type BoardTask = {
  id: string;
  title: string;
  description: string;
};

type BoardSupertask = {
  id: string;
  title: string;
  tasks: BoardTask[];
};

const boardSupertasks: BoardSupertask[] = [
  {
    id: "supertask-auth",
    title: "User Authentication",
    tasks: [
      {
        id: "task-1",
        title: "Implement login flow",
        description: "Build the login form, validation, and session handling.",
      },
      {
        id: "task-2",
        title: "Implement signup flow",
        description: "Build the signup form and email verification.",
      },
    ],
  },
  {
    id: "supertask-dashboard",
    title: "Dashboard",
    tasks: [
      {
        id: "task-3",
        title: "Design dashboard wireframes",
        description: "Sketch out the layout and core widgets.",
      },
      {
        id: "task-4",
        title: "Build dashboard UI",
        description: "Implement the layout and interactions.",
      },
    ],
  },
  {
    id: "supertask-api",
    title: "API Layer",
    tasks: [
      {
        id: "task-5",
        title: "API endpoint testing",
        description: "Write integration tests for core endpoints.",
      },
    ],
  },
  {
    id: "supertask-infra",
    title: "Infrastructure",
    tasks: [
      {
        id: "task-6",
        title: "Deploy CI/CD pipeline",
        description: "Set up automated build and deploy on push.",
      },
      {
        id: "task-7",
        title: "Database migration script",
        description: "Write and test the migration for the new schema.",
      },
    ],
  },
];

const viewTabs = [
  { id: "table", label: "Table" },
  { id: "board", label: "Board" },
] as const;

type ViewMode = (typeof viewTabs)[number]["id"];

// ---- Reusable faceted filter dropdown (shadcn Popover + Command pattern) ----
type FacetedOption = { label: string; value: string; color?: string };

function FacetedFilter({
  title,
  options,
  selected,
  onChange,
  styleMap,
}: {
  title: string;
  options: FacetedOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  styleMap: Record<string, string>;
}) {
  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const clearAll = () => onChange([]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <PlusCircle className="mr-2 h-4 w-4" />
          {title}
          {selected.length > 0 && (
            <>
              <Separator orientation="vertical" className="mx-2 h-4" />
              <Badge
                variant="secondary"
                className="rounded-sm px-1 font-normal lg:hidden"
              >
                {selected.length}
              </Badge>
              <div className="hidden space-x-1 lg:flex">
                {selected.length > 2 ? (
                  <Badge
                    variant="secondary"
                    className="rounded-sm px-1 font-normal"
                  >
                    {selected.length} selected
                  </Badge>
                ) : (
                  options
                    .filter((o) => selected.includes(o.value))
                    .map((o) => (
                      <Badge
                        key={o.value}
                        className={`rounded-sm px-1 font-normal border-0 ${styleMap[o.value]}`}
                      >
                        {o.label}
                      </Badge>
                    ))
                )}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <Command>
          <CommandList>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selected.includes(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => toggle(option.value)}
                  >
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible",
                      )}
                    >
                      <Check className="h-3 w-3" />
                    </div>
                    {option.color && (
                      <span
                        className="mr-2 h-2 w-2 rounded-full"
                        style={{ backgroundColor: option.color }}
                      />
                    )}
                    <span>{option.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selected.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={clearAll}
                    className="justify-center text-center"
                  >
                    Clear filters
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function Task() {
  const [selectValue, setSelectValue] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [complexityFilter, setComplexityFilter] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  // Real task selected from the table (View button)
  const [selectedTask, setSelectedTask] = useState<TaskResponse | null>(null);
  // Mock board card selected from the Board view (separate shape, not a real Task)
  const [selectedBoardCard, setSelectedBoardCard] = useState<BoardTask | null>(
    null,
  );
  const [openTaskDialog, setOpenTaskDialog] = useState(false);

  const { data: user } = useCurrentUser();
  const { data: currentProject } = useGetCurrentProject(user?.id ?? "");
  const projectId = currentProject?.id ?? "";

  const {
    data: allProjectTasks,
    isLoading: isTasksLoading,
    isError: isTasksError,
  } = useGetAllProjectTask(projectId);
  const { data: project } = useGetOneProjectWithSpanshot(projectId);
  const snapshot = project?.snapshot;

  const filteredTasks = (allProjectTasks ?? []).filter((task) => {
    if (priorityFilter.length > 0 && !priorityFilter.includes(task.priority)) {
      return false;
    }
    if (
      statusFilter.length > 0 &&
      !statusFilter.includes(task.status ?? "not_started")
    ) {
      return false;
    }
    if (
      complexityFilter.length > 0 &&
      task.complexity &&
      !complexityFilter.includes(task.complexity)
    ) {
      return false;
    }
    // NOTE: assigned-member filter (selectValue) is disabled here —
    // TaskResponse doesn't include an assignees list yet, same TODO as ProjectView.tsx.
    return true;
  });

  // Stats derived from real fetched tasks
  const stats = [
    {
      icon: <CheckSquare className="h-6 w-6 text-green-500" />,
      change: "+3%",
      value: (allProjectTasks ?? []).filter((t) => t.status === "completed")
        .length,
      label: "TASKS COMPLETED",
    },
    {
      icon: <Clock className="h-6 w-6 text-yellow-500" />,
      change: "+22%",
      value: (allProjectTasks ?? []).filter((t) => t.status === "in-progress")
        .length,
      label: "IN PROGRESS",
    },
    {
      icon: <XSquare className="h-6 w-6 text-red-500" />,
      change: "+28%",
      value: (allProjectTasks ?? []).filter((t) => t.status === "not_started")
        .length,
      label: "STUCK",
      valueColor: "text-red-500",
    },
    {
      icon: <BarChart2 className="h-6 w-6 text-purple-400" />,
      change: "+36%",
      value: 9,
      label: "AVG. COMPLETION",
    },
  ];

  return (
    <AppLayout breadcrumbs={[{ label: "Project Task", href: "/project-task" }]}>
      <div className="min-w-0 w-full">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Distribute and manage tasks
        </h1>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <Card key={i}>
              <CardContent className="flex flex-col gap-2 p-4">
                <div className="flex items-center justify-between">
                  {stat.icon}
                  <span className="text-xs text-green-500 font-medium">
                    {stat.change} ↑
                  </span>
                </div>
                <p
                  className={`text-3xl font-bold ${stat.valueColor ?? "text-gray-900 dark:text-gray-100"}`}
                >
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground font-medium">
                  {stat.label}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
        {typeof snapshot?.unassigned_tasks === "number" &&
          snapshot.unassigned_tasks > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                {snapshot.unassigned_tasks} task
                {snapshot.unassigned_tasks > 1 ? "s" : ""} unassigned
                {" — "}
                assign {snapshot.unassigned_tasks > 1 ? "them" : "it"} to keep
                workload balance accurate.
              </span>
            </div>
          )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {viewTabs.map((tab) => (
              <Button
                key={tab.id}
                variant={viewMode === tab.id ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode(tab.id)}
              >
                {tab.label}
              </Button>
            ))}
          </div>
          <div className="items-center">
            <AddTaskDialog
              trigger={
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground/90"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  ADD TASK
                </Button>
              }
            />
          </div>
        </div>

        {viewMode === "table" && (
          <div className="mt-6 flex sm:items-center sm:justify-between">
            <div className="flex gap-2 items-center">
              <FacetedFilter
                title="Priority"
                options={priorityOptions}
                selected={priorityFilter}
                onChange={setPriorityFilter}
                styleMap={priorityStyle}
              />
              <FacetedFilter
                title="Status"
                options={statusOptions}
                selected={statusFilter}
                onChange={setStatusFilter}
                styleMap={statusStyle}
              />
              <FacetedFilter
                title="Complexity"
                options={complexityOptions}
                selected={complexityFilter}
                onChange={setComplexityFilter}
                styleMap={complexityStyle}
              />
            </div>

            <div>
              <Select
                value={selectValue}
                onValueChange={(val) => {
                  setSelectValue(val);
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Assigned Member" />
                </SelectTrigger>

                <SelectContent position="popper" align="end" className="w-40">
                  <SelectItem value="all">All Members</SelectItem>
                  <SelectItem value="JW">John Wesley</SelectItem>
                  <SelectItem value="DM">Dylan Mangaoang</SelectItem>
                  <SelectItem value="HG">Harry Guzman</SelectItem>
                  <SelectItem value="RM">Rommel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {viewMode === "table" ? (
          <Card className="p-0 mt-6">
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
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isTasksLoading ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-muted-foreground py-8"
                      >
                        Loading tasks...
                      </TableCell>
                    </TableRow>
                  ) : isTasksError ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-rose-600 py-8"
                      >
                        Failed to load tasks.
                      </TableCell>
                    </TableRow>
                  ) : filteredTasks.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-muted-foreground py-8"
                      >
                        No tasks found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className="text-gray-800 dark:text-gray-200 font-medium">
                          {task.name}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`${statusStyle[task.status ?? "not_started"]} border-0`}
                          >
                            {(task.status ?? "not_started").replace(
                              /[-_]/g,
                              " ",
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`${priorityStyle[task.priority]} border-0`}
                          >
                            {task.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {/* TODO: real assignee avatars once TaskResponse includes assignees */}
                          <span className="text-xs text-neutral-400">—</span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {task.deadline
                            ? new Date(task.deadline).toLocaleDateString()
                            : "No deadline"}
                        </TableCell>
                        <TableCell>
                          {task.complexity ? (
                            <Badge
                              className={`${complexityStyle[task.complexity]} border-0`}
                            >
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
                            <Button variant="destructive" size="sm">
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          // ---- Board view: Supertask columns, Task cards inside (MOCK DATA) ----
          <div className="mt-4 w-full min-w-0 overflow-x-auto pb-2 relative no-scrollbar">
            <div className="flex w-max gap-4">
              {boardSupertasks.map((supertask) => (
                <Card
                  key={supertask.id}
                  className="w-[85vw] shrink-0 border-dashed sm:w-70"
                >
                  <CardContent className="p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-semibold text-foreground">
                        {supertask.title}
                      </h3>
                      <Badge variant="secondary">
                        {supertask.tasks.length}
                      </Badge>
                    </div>

                    <div className="flex max-h-[55vh] flex-col gap-3 overflow-y-auto pr-1">
                      {supertask.tasks.map((task) => (
                        <div
                          key={task.id}
                          className="rounded-lg border bg-background p-3 shadow-sm"
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-foreground">
                              {task.title}
                            </p>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-0 h-6 w-6"
                              onClick={() => {
                                setSelectedBoardCard(task);
                                setOpenTaskDialog(true);
                              }}
                              aria-label={`View ${task.title}`}
                            >
                              <Eye className="h-4 w-4 text-primary" />
                            </Button>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {task.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <Dialog
          open={openTaskDialog}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedTask(null);
              setSelectedBoardCard(null);
            }
            setOpenTaskDialog(open);
          }}
        >
          <DialogContent
            showCloseButton={false}
            className="rounded-xl p-0 overflow-hidden sm:max-w-250 max-h-[75vh] flex flex-col"
          >
            <DialogHeader className="border-b px-4 py-3 shrink-0">
              <DialogTitle>Task Details</DialogTitle>
              <DialogDescription>
                {selectedTask?.name ??
                  selectedBoardCard?.title ??
                  "Select a task to view details."}
              </DialogDescription>
            </DialogHeader>

            {selectedTask ? (
              <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 py-4">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">
                    {selectedTask.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Review the task information and current progress below.
                  </p>
                </div>

                <div className="mt-4 grid gap-3">
                  <div className="rounded-md border bg-muted/50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Status
                    </p>
                    <Badge
                      className={`border-0 mt-2 ${statusStyle[selectedTask.status ?? "not_started"]}`}
                    >
                      {(selectedTask.status ?? "not_started").replace(
                        /[-_]/g,
                        " ",
                      )}
                    </Badge>
                  </div>

                  <div className="rounded-md border bg-muted/50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Priority
                    </p>
                    <Badge
                      className={`border-0 mt-2 ${priorityStyle[selectedTask.priority]}`}
                    >
                      {selectedTask.priority}
                    </Badge>
                  </div>

                  {selectedTask.complexity && (
                    <div className="rounded-md border bg-muted/50 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Complexity
                      </p>
                      <Badge
                        className={`border-0 mt-2 ${complexityStyle[selectedTask.complexity]}`}
                      >
                        {selectedTask.complexity}
                      </Badge>
                    </div>
                  )}

                  <div className="rounded-md border bg-muted/50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Due date
                    </p>
                    <p className="mt-2 text-sm text-foreground">
                      {selectedTask.deadline
                        ? new Date(selectedTask.deadline).toLocaleString()
                        : "No deadline"}
                    </p>
                  </div>

                  {selectedTask.description && (
                    <div className="rounded-md border bg-muted/50 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Description
                      </p>
                      <p className="mt-2 text-sm text-foreground">
                        {selectedTask.description}
                      </p>
                    </div>
                  )}

                  {/* TODO: real assigned-users list once TaskResponse includes assignees */}
                </div>
              </div>
            ) : selectedBoardCard ? (
              <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 py-4">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">
                    {selectedBoardCard.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedBoardCard.description}
                  </p>
                </div>
              </div>
            ) : null}

            <DialogFooter className="sticky bottom-0 z-10 border-t bg-background/95 px-8 shrink-0">
              <DialogClose asChild>
                <Button variant="outline" className="min-w-24">
                  Close
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
