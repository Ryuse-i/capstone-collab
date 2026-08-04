import { useState } from "react";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Files,
  FolderKanban,
  Gauge,
  Target,
  Users,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import AppLayout from "@/layouts/Applayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

type ProjectViewTab = "overview" | "tasks" | "members" | "resources";

const tabs: { id: ProjectViewTab; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <Activity className="h-4 w-4" /> },
  { id: "tasks", label: "Tasks", icon: <Target className="h-4 w-4" /> },
  { id: "members", label: "Members", icon: <Users className="h-4 w-4" /> },
  { id: "resources", label: "Resources", icon: <Files className="h-4 w-4" /> },
];

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
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }

  return value.toFixed(digits);
}

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

  const overviewCards = [
    {
      label: "Progress",
      value: `${formatNumber(snapshot?.progress_percentage)}%`,
      caption: `Expected ${formatNumber(snapshot?.expected_percentage)}%`,
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
      value: `${snapshot?.completed_tasks ?? 0}`,
      caption: "Tasks completed",
      icon: <FolderKanban className="h-4 w-4 text-[#3F3350]" />,
    },
    {
      label: "Workload balance",
      value: `${formatNumber(snapshot?.workload_balance)}%`,
      caption: snapshot?.imbalance_severity ?? "No severity data",
      icon: <BarChart3 className="h-4 w-4 text-[#7A0C2E]" />,
    },
  ];

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

  const filteredTasks = allTasks;

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
                  {formatNumber(snapshot?.progress_percentage)}% progress
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
                          {snapshot?.completed_tasks ?? 0}
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
                      {formatNumber(snapshot?.progress_percentage)}% of its
                      expected progress and is currently marked as{" "}
                      {snapshot?.health_status ?? "unknown"}.
                    </p>
                  </Card>
                </div>

                <Card className="border border-neutral-200 p-0">
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
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTasks.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={6}
                              className="py-8 text-center text-muted-foreground"
                            >
                              No tasks found.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredTasks.map((task) => (
                            <TableRow key={task.name}>
                              <TableCell className="font-medium text-[#231A2E]">
                                {task.name}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={`${statusStyle[task.status]} border-0`}
                                >
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
                                  {task.assigned.map((member) => (
                                    <div
                                      key={member}
                                      className="flex h-8 w-8 items-center justify-center rounded-full bg-[#7A0C2E] text-xs font-bold text-white ring-1 ring-white"
                                    >
                                      {member}
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
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
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
                        {formatNumber(snapshot?.workload_balance)}%
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
