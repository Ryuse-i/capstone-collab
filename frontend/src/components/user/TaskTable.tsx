import { useState } from "react";
import { Check, PlusCircle } from "lucide-react";

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

import { AddTaskDialog } from "@/components/user/AddTaskDialog";
import { ViewTaskDialog } from "@/components/user/ViewTaskDialog";
import EditTaskDialog from "@/components/user/EditTaskDialog";
import DeleteTaskDialog from "@/components/user/DeleteTaskDialog";

import type {
  TaskComplexity,
  TaskPriority,
  TaskResponseMembers,
  TaskStatus,
} from "@/types/task";

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

const statusOptions = [
  {
    label: "Completed",
    value: "completed",
    color: "#22c55e",
  },
  {
    label: "Submitted",
    value: "submitted",
    color: "#eab308",
  },
  {
    label: "In Progress",
    value: "in-progress",
    color: "#3b82f6",
  },
  {
    label: "Not Started",
    value: "not_started",
    color: "#9ca3af",
  },
];

const priorityOptions = [
  {
    label: "High",
    value: "high",
    color: "#ef4444",
  },
  {
    label: "Medium",
    value: "medium",
    color: "#eab308",
  },
  {
    label: "Low",
    value: "low",
    color: "#9ca3af",
  },
];

const complexityOptions = [
  {
    label: "High",
    value: "high",
    color: "#ef4444",
  },
  {
    label: "Medium",
    value: "medium",
    color: "#eab308",
  },
  {
    label: "Low",
    value: "low",
    color: "#9ca3af",
  },
];

type FacetedOption = {
  label: string;
  value: string;
  color?: string;
};

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
      onChange(selected.filter((item) => item !== value));
      return;
    }

    onChange([...selected, value]);
  };

  const clearAll = () => {
    onChange([]);
  };

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
                    .filter((option) => selected.includes(option.value))
                    .map((option) => (
                      <Badge
                        key={option.value}
                        className={`rounded-sm border-0 px-1 font-normal ${
                          styleMap[option.value]
                        }`}
                      >
                        {option.label}
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
                        style={{
                          backgroundColor: option.color,
                        }}
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

interface TaskTableProps {
  tasks: TaskResponseMembers[];
  projectId: string;
  isLoading: boolean;
  isError: boolean;
}

export function TaskTable({
  tasks,
  projectId,
  isLoading,
  isError,
}: TaskTableProps) {
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [complexityFilter, setComplexityFilter] = useState<string[]>([]);
  const [selectValue, setSelectValue] = useState("all");

  const [selectedTask, setSelectedTask] = useState<TaskResponseMembers | null>(
    null,
  );
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const filteredTasks = tasks.filter((task) => {
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

    // Assigned member filtering is currently disabled because
    // TaskResponse does not expose assignees yet.
    // selectValue is still kept so the UI is ready for it later.
    void selectValue;

    return true;
  });

  const handleViewTask = (task: TaskResponseMembers) => {
    setSelectedTask(task);
    setViewDialogOpen(true);
  };

  const handleViewDialogChange = (open: boolean) => {
    setViewDialogOpen(open);

    if (!open) {
      setSelectedTask(null);
    }
  };

  return (
    <div className="mt-6 space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
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

          <Select value={selectValue} onValueChange={setSelectValue}>
            <SelectTrigger className="h-8 w-40">
              <SelectValue placeholder="Assigned Member" />
            </SelectTrigger>

            <SelectContent position="popper" align="start" className="w-40">
              <SelectItem value="all">All Members</SelectItem>

              <SelectItem value="JW">John Wesley</SelectItem>

              <SelectItem value="DM">Dylan Mangaoang</SelectItem>

              <SelectItem value="HG">Harry Guzman</SelectItem>

              <SelectItem value="RM">Rommel</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Add task */}
        <AddTaskDialog
          projectId={projectId}
          trigger={
            <Button size="sm" className="h-8">
              <PlusCircle className="mr-2 h-4 w-4" />
              ADD TASK
            </Button>
          }
        />
      </div>

      {/* Table */}
      <Card className="p-0">
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
                <TableHead className="w-45">Action</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center text-muted-foreground"
                  >
                    Loading tasks...
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center text-rose-600"
                  >
                    Failed to load tasks.
                  </TableCell>
                </TableRow>
              ) : filteredTasks.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No tasks found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTasks.map((task) => {
                  const status = task.status ?? "not_started";

                  return (
                    <TableRow key={task.id}>
                      {/* Task */}
                      <TableCell className="font-medium text-gray-800 dark:text-gray-200">
                        {task.name}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge
                          className={`${statusStyle[status]} border-0 capitalize`}
                        >
                          {status.replace(/[-_]/g, " ")}
                        </Badge>
                      </TableCell>

                      {/* Priority */}
                      <TableCell>
                        <Badge
                          className={`${priorityStyle[task.priority]} border-0 capitalize`}
                        >
                          {task.priority}
                        </Badge>
                      </TableCell>

                      {/* Assigned */}
                      <TableCell>
                        {/* TODO:
                            Replace this once TaskResponse
                            contains assignee information.
                        */}
                        <span className="text-xs text-neutral-400">—</span>
                      </TableCell>

                      {/* Due Date */}
                      <TableCell className="text-muted-foreground">
                        {task.deadline
                          ? new Date(task.deadline).toLocaleDateString()
                          : "No deadline"}
                      </TableCell>

                      {/* Complexity */}
                      <TableCell>
                        {task.complexity ? (
                          <Badge
                            className={`${complexityStyle[task.complexity]} border-0 capitalize`}
                          >
                            {task.complexity}
                          </Badge>
                        ) : (
                          <span className="text-xs text-neutral-400">—</span>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          {/* View */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewTask(task)}
                          >
                            View
                          </Button>

                          {/* Edit */}
                          <EditTaskDialog
                            task={task}
                            projectId={projectId}
                            trigger={
                              <Button variant="outline" size="sm">
                                Edit
                              </Button>
                            }
                          />

                          {/* Delete */}
                          <DeleteTaskDialog task={task} projectId={projectId} />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Task Dialog */}
      <ViewTaskDialog
        task={selectedTask}
        open={viewDialogOpen}
        onOpenChange={handleViewDialogChange}
      />
    </div>
  );
}

export default TaskTable;
