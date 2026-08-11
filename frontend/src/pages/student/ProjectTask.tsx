import { useState } from "react";
import AppLayout from "@/layouts/Applayout";
import {
  CheckSquare,
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

const allTasks = [
  {
    name: "Implement user authentication system",
    status: "Completed",
    priority: "High",
    complexity: "High",
    assigned: ["JW"],
    due: "Apr 20",
  },
  {
    name: "Design dashboard wireframes",
    status: "Completed",
    priority: "Medium",
    complexity: "Low",
    assigned: ["DM"],
    due: "Apr 3",
  },
  {
    name: "API endpoint testing",
    status: "Submitted",
    priority: "Low",
    complexity: "Medium",
    assigned: ["HG"],
    due: "Mar 13",
  },
  {
    name: "Database migration script",
    status: "In Progress",
    priority: "High",
    complexity: "High",
    assigned: ["JW", "HG"],
    due: "Mar 28",
  },
  {
    name: "Deploy CI/CD pipeline",
    status: "Not Started",
    priority: "High",
    complexity: "Medium",
    assigned: ["RM"],
    due: "Apr 17",
  },
  {
    name: "Write unit tests",
    status: "In Progress",
    priority: "Medium",
    complexity: "Low",
    assigned: ["DM"],
    due: "Apr 25",
  },
  {
    name: "Fix login bug",
    status: "Completed",
    priority: "High",
    complexity: "Low",
    assigned: ["JW"],
    due: "Mar 10",
  },
];

const statusStyle: Record<string, string> = {
  Completed: "bg-green-100 text-green-700",
  Submitted: "bg-yellow-100 text-yellow-700",
  "In Progress": "bg-blue-100 text-blue-700",
  "Not Started": "bg-gray-100 text-gray-500",
};

const priorityStyle: Record<string, string> = {
  High: "bg-red-100 text-red-600",
  Medium: "bg-yellow-100 text-yellow-600",
  Low: "bg-gray-100 text-gray-500",
};

const complexityStyle: Record<string, string> = {
  High: "bg-red-100 text-red-600",
  Medium: "bg-yellow-100 text-yellow-600",
  Low: "bg-gray-100 text-gray-500",
};

// Option lists for the faceted filters (dot color mirrors the badge palette)
const statusOptions = [
  { label: "Completed", value: "Completed", color: "#22c55e" },
  { label: "Submitted", value: "Submitted", color: "#eab308" },
  { label: "In Progress", value: "In Progress", color: "#3b82f6" },
  { label: "Not Started", value: "Not Started", color: "#9ca3af" },
];

const priorityOptions = [
  { label: "High", value: "High", color: "#ef4444" },
  { label: "Medium", value: "Medium", color: "#eab308" },
  { label: "Low", value: "Low", color: "#9ca3af" },
];

const complexityOptions = [
  { label: "High", value: "High", color: "#ef4444" },
  { label: "Medium", value: "Medium", color: "#eab308" },
  { label: "Low", value: "Low", color: "#9ca3af" },
];

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
  const [selectedTask, setSelectedTask] = useState<
    (typeof allTasks)[number] | null
  >(null);
  const [openTaskDialog, setOpenTaskDialog] = useState(false);

  // Filter logic
  const filteredTasks = allTasks.filter((task) => {
    if (priorityFilter.length > 0 && !priorityFilter.includes(task.priority)) {
      return false;
    }
    if (statusFilter.length > 0 && !statusFilter.includes(task.status)) {
      return false;
    }
    if (
      complexityFilter.length > 0 &&
      !complexityFilter.includes(task.complexity)
    ) {
      return false;
    }
    // ASSIGNED MEMBER FILTER
    if (selectValue !== "all" && !task.assigned.includes(selectValue)) {
      return false;
    }

    return true;
  });

  // Stats derived from allTasks
  const stats = [
    {
      icon: <CheckSquare className="h-6 w-6 text-green-500" />,
      change: "+3%",
      value: allTasks.filter((t) => t.status === "Completed").length,
      label: "TASKS COMPLETED",
    },
    {
      icon: <Clock className="h-6 w-6 text-yellow-500" />,
      change: "+22%",
      value: allTasks.filter((t) => t.status === "In Progress").length,
      label: "IN PROGRESS",
    },
    {
      icon: <XSquare className="h-6 w-6 text-red-500" />,
      change: "+28%",
      value: allTasks.filter((t) => t.status === "Not Started").length,
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
      <h1 className="text-2xl font-bold text-foreground mb-2">
        Distribute and manage tasks
      </h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Faceted filter dropdowns */}
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

        {/* Existing dropdown — left unchanged */}
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
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground py-8"
                  >
                    No tasks found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTasks.map((task, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-gray-800 dark:text-gray-200 font-medium">
                      {task.name}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${statusStyle[task.status]} border-0`}>
                        {task.status}
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
                      <div className="flex -space-x-2">
                        {task.assigned.map((a, j) => (
                          <div
                            key={j}
                            className="h-8 w-8 rounded-full bg-primary dark:bg-gray-800 dark:border dark:ring-gray-600 text-primary-foreground dark:text-foreground flex items-center justify-center text-xs font-bold ring-1 ring-white"
                          >
                            {a}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {task.due}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`${complexityStyle[task.complexity]} border-0`}
                      >
                        {task.complexity}
                      </Badge>
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

      <Dialog
        open={openTaskDialog}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTask(null);
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
              {selectedTask
                ? selectedTask.name
                : "Select a task to view details."}
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
                    className={`border-0 mt-2 ${statusStyle[selectedTask.status]}`}
                  >
                    {selectedTask.status}
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

                <div className="rounded-md border bg-muted/50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Due date
                  </p>
                  <p className="mt-2 text-sm text-foreground">
                    {selectedTask.due}
                  </p>
                </div>

                <div className="rounded-md border bg-muted/50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Assigned users
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {selectedTask.assigned.map((member) => (
                      <div
                        key={member}
                        className="flex items-center gap-2 rounded-md bg-background/50 px-2 py-2"
                      >
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                          {member}
                        </div>
                        <span className="text-sm text-foreground">
                          {member}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
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
    </AppLayout>
  );
}
