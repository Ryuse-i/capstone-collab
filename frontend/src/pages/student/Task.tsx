import { useState } from "react";
import AppLayout from "@/layouts/Applayout";
import { CheckSquare, Clock, XSquare, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

const allTasks = [
  {
    name: "Implement user authentication system",
    status: "Completed",
    priority: "High",
    assigned: ["JW"],
    due: "Apr 20",
  },
  {
    name: "Design dashboard wireframes",
    status: "Completed",
    priority: "Medium",
    assigned: ["DM"],
    due: "Apr 3",
  },
  {
    name: "API endpoint testing",
    status: "Submitted",
    priority: "Low",
    assigned: ["HG"],
    due: "Mar 13",
  },
  {
    name: "Database migration script",
    status: "In Progress",
    priority: "High",
    assigned: ["JW", "HG"],
    due: "Mar 28",
  },
  {
    name: "Deploy CI/CD pipeline",
    status: "Not Started",
    priority: "High",
    assigned: ["RM"],
    due: "Apr 17",
  },
  {
    name: "Write unit tests",
    status: "In Progress",
    priority: "Medium",
    assigned: ["DM"],
    due: "Apr 25",
  },
  {
    name: "Fix login bug",
    status: "Completed",
    priority: "High",
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

const filterTabs = [
  "All Task",
  "In Progress",
  "Submitted",
  "Completed",
  "High Priority",
];

export default function Task() {
  const [activeTab, setActiveTab] = useState("All Task");
  const [selectValue, setSelectValue] = useState("all");

  // Filter logic
  const filteredTasks = allTasks.filter((task) => {
    if (activeTab === "High Priority" && task.priority !== "High") {
      return false;
    }

    if (
      activeTab !== "All Task" &&
      activeTab !== "High Priority" &&
      task.status !== activeTab
    ) {
      return false;
    }

    // ASSIGNED MEMBER FILTER
    if (selectValue !== "all") {
      return task.assigned.includes(selectValue);
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
    <AppLayout breadcrumbs={[{ label: "Task", href: "/task" }]}>
      {/* +New Task button */}
      <div className="flex justify-end">
        <Button>+ New Task</Button>
      </div>

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
                className={`text-3xl font-bold ${stat.valueColor ?? "text-gray-900"}`}
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

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {filterTabs.map((f) => (
          <Button
            key={f}
            variant={activeTab === f ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setActiveTab(f);
              setSelectValue("all"); // reset dropdown when tab changes
            }}
          >
            {f}
          </Button>
        ))}
      </div>

      {/* Dropdown */}
      <div>
        <Select
          value={selectValue}
          onValueChange={(val) => {
            setSelectValue(val);
            
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Assigned Member" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">All Members</SelectItem>
            <SelectItem value="JW">John Wesley</SelectItem>
            <SelectItem value="DM">Dylan Mangaoang</SelectItem>
            <SelectItem value="HG">Harry Guzman</SelectItem>
            <SelectItem value="RM">Rommel</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
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
                    <TableCell className="text-gray-800">{task.name}</TableCell>
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
                            className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold ring-2 ring-white"
                          >
                            {a}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {task.due}
                    </TableCell>
                    <TableCell className="text-muted-foreground">—</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
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
    </AppLayout>
  );
}
