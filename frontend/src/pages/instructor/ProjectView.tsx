import { useMemo, useState, useEffect } from "react";
import { Spinner } from "@/components/ui/spinner";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  Code2,
  FileText,
  Files,
  FolderKanban,
  Frame,
  Gauge,
  Target,
  Users,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle } from "lucide-react";

import AppLayout from "@/layouts/Applayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskTable } from "@/components/user/TaskTable";
import ResourceDialog from "@/components/user/ResourceDialog";
import { RESOURCES, type Resource } from "@/pages/student/Resources";
import { cn } from "@/lib/utils";

import { useGetOneProjectWithSpanshot } from "@/hooks/useProject";
import { useGetAllTaskAssignedMembers } from "@/hooks/useTask";
import { useGetMembersWithUserInfo } from "@/hooks/useProjectMember";
import { rememberLastVisitedProjects } from "@/lib/lastVisitedProjects";

type ProjectViewTab =
  | "overview"
  | "tasks"
  | "submissions"
  | "members"
  | "resources";

const tabs: {
  id: ProjectViewTab;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "overview",
    label: "Overview",
    icon: <Activity className="h-4 w-4" />,
  },
  {
    id: "tasks",
    label: "Tasks",
    icon: <Target className="h-4 w-4" />,
  },
  {
    id: "submissions",
    label: "Submissions",
    icon: <ClipboardCheck className="h-4 w-4" />,
  },
  {
    id: "members",
    label: "Members",
    icon: <Users className="h-4 w-4" />,
  },
  {
    id: "resources",
    label: "Resources",
    icon: <Files className="h-4 w-4" />,
  },
];

function getHealthClasses(status?: string) {
  switch (status) {
    case "healthy":
      return "bg-emerald-100 text-emerald-700 dark:text-emerald-100";
    case "at_risk":
      return "bg-amber-100 text-amber-700 dark:text-amber-100";
    case "critical":
      return "bg-rose-100 text-rose-700 dark:text-rose-100";
    default:
      return "bg-neutral-100 text-neutral-700 dark:text-neutral-100";
  }
}

function formatNumber(value?: number, digits = 1) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "None";
  }

  return value.toFixed(digits);
}

function formatCount(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "None";
  }

  return `${value}`;
}

function formatPercentage(value?: number, digits = 1) {
  const formatted = formatNumber(value, digits);

  return formatted === "None" ? "None" : `${formatted}%`;
}

export default function ProjectView() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [activeTab, setActiveTab] = useState<ProjectViewTab>("overview");
  const [selectedResource, setSelectedResource] = useState<Resource | null>(
    null,
  );

  const projectId = id ?? "";

  // Remember this project's view page so the sidebar's "Projects" item
  // returns here after visiting other pages, instead of resetting to
  // the project list.
  useEffect(() => {
    if (projectId) {
      rememberLastVisitedProjects(`/view-project/${projectId}`);
    }
  }, [projectId]);

  const {
    data: project,
    isLoading,
    isError,
  } = useGetOneProjectWithSpanshot(projectId);

  const snapshot = project?.snapshot;

  // ---- Tasks: live data ----
  const {
    data: allProjectTasks,
    isLoading: isTasksLoading,
    isError: isTasksError,
  } = useGetAllTaskAssignedMembers(projectId);

  // ---- Members: leader / advisor / instructor ----
  const {
    data: projectMembersData,
    isLoading: isMembersLoading,
    isError: isMembersError,
  } = useGetMembersWithUserInfo(projectId);

  const getMemberName = (role: string) => {
    const member = projectMembersData?.find(
      (projectMember) =>
        projectMember.project_role === role && projectMember.users,
    );

    if (!member || !member.users) return "None";

    const fullName = `${member.users.first_name ?? ""} ${
      member.users.last_name ?? ""
    }`.trim();

    return fullName || "None";
  };

  const { leaderName, advisorName, instructorName } = useMemo(() => {
    if (isMembersLoading) {
      return {
        leaderName: "Loading...",
        advisorName: "Loading...",
        instructorName: "Loading...",
      };
    }

    if (isMembersError || !projectMembersData) {
      return {
        leaderName: "None",
        advisorName: "None",
        instructorName: "None",
      };
    }

    return {
      leaderName: getMemberName("leader"),
      advisorName: getMemberName("advisor"),
      instructorName: getMemberName("instructor"),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectMembersData, isMembersLoading, isMembersError]);

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
        ? snapshot.health_status.replace(/_/, " ")
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

  const submittedTasks = (allProjectTasks ?? []).filter(
    (task) => task.status === "submitted" || task.status === "completed",
  );
  const submittedCount = submittedTasks.filter(
    (task) => task.status === "submitted",
  ).length;
  const completedCount = submittedTasks.filter(
    (task) => task.status === "completed",
  ).length;

  if (isLoading) {
    return (
      <AppLayout breadcrumbs={[{ label: "Projects", href: "/project-list" }]}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <button
              onClick={() => navigate("/project-list")}
              className="mb-4 flex items-center gap-2 text-sm font-medium text-[#7A0C2E]"
            >
              <ArrowLeft size={16} />
              Back to projects
            </button>
            <div className="flex flex-1 justify-center items-center">
              <Spinner/>
            </div>
            <p className="text-foreground dark:text-muted-foreground">Loading project details...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Error state
  if (isError || !project) {
    return (
      <AppLayout breadcrumbs={[{ label: "Projects", href: "/project-list" }]}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <button
              onClick={() => navigate("/project-list")}
              className="mb-4 flex items-center gap-2 text-sm font-medium text-[#7A0C2E]"
            >
              <ArrowLeft size={16} />
              Back to projects
            </button>
            <div className="rounded-full h-12 w-12 border-b-2 border-destructive mb-4">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <p className="text-foreground dark:text-muted-foreground">
              Failed to load project details. Please try again.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      breadcrumbs={[
        { label: "Projects", href: "/project-list" },
        { label: project?.name },
      ]}
    >
      <div className="min-h-screen w-full py-2">
        <button
          onClick={() => navigate("/project-list")}
          className="mb-5 flex items-center gap-2 text-sm font-medium text-[#7A0C2E]"
        >
          <ArrowLeft size={16} />
          Back to projects
        </button>

        <Card className="overflow-hidden border shadow-sm">
          {/* Project Header */}
          <div className="border-4 rounded-lg border-neutral-200 p-6 m-2">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="mt-2 text-2xl font-bold text-foreground">
                  {project.name}
                </h1>

                <p className="mt-3 max-w-2xl text-sm text-neutral-600">
                  {project.description}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-sm font-semibold bg-card dark:ring-1 ring-foreground/10${getHealthClasses(snapshot?.health_status)}`}
                >
                  {snapshot?.health_status
                    ? snapshot.health_status.replace(/_/g, " ")
                    : "Unknown"}
                </span>
                <span className="rounded-full bg-white dark:bg-card dark:ring-1 ring-foreground/10 px-3 py-1 text-sm font-semibold text-[#7A0C2E] shadow-sm">
                  {formatPercentage(snapshot?.progress_percentage)} progress
                </span>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Tabs */}
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

            {/* Overview */}
            {activeTab === "overview" && (
              <div className="mt-6 space-y-6">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {overviewCards.map((card) => (
                    <div
                      key={card.label}
                      className="rounded-2xl border bg-card p-4"
                    >
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        {card.icon}
                        {card.label}
                      </div>
                      <p className="mt-3 text-2xl font-bold text-foreground">
                        {card.value}
                      </p>
                      <p className="mt-1 text-sm text-neutral-500">
                        {card.caption}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Card className="border p-4">
                    <h2 className="text-lg font-semibold text-foreground">
                      Details
                    </h2>
                    <div className="mt-4 space-y-3 text-sm text-neutral-600">
                      <div className="flex justify-between gap-3 text-foreground">
                        <span>Expected score</span>
                        <span className="font-semibold text-(--semi-foreground)">
                          {formatNumber(snapshot?.expected_score)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3 text-foreground">
                        <span>Workload points</span>
                        <span className="font-semibold text-(--semi-foreground)">
                          {formatNumber(snapshot?.total_workload_points, 0)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3 text-foreground">
                        <span>Schedule variance</span>
                        <span className="font-semibold text-(--semi-foreground)">
                          {formatNumber(snapshot?.schedule_variance)}
                        </span>
                      </div>
                    </div>
                  </Card>

                  <Card className="border p-4">
                    <h2 className="text-lg font-semibold text-foreground">
                      Project contacts
                    </h2>
                    <div className="mt-4 space-y-3 text-sm text-neutral-600">
                      <div className="flex items-center justify-between rounded-lg bg-neutral-50 dark:bg-(--semi-card) dark:text-foreground px-3 py-2">
                        <span>Project leader</span>
                        <span className="font-semibold text-(--semi-foreground)">
                          {leaderName}
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-neutral-50 dark:bg-(--semi-card) dark:text-foreground px-3 py-2">
                        <span>Instructor</span>
                        <span className="font-semibold text-(--semi-foreground)">
                          {instructorName}
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-neutral-50 dark:bg-(--semi-card) dark:text-foreground px-3 py-2">
                        <span>Advisor</span>
                        <span className="font-semibold text-(--semi-foreground)">
                          {advisorName}
                        </span>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {/* Tasks */}
            {activeTab === "tasks" && (
              <div className="mt-6 space-y-6">
                <div className="grid gap-4 lg:grid-cols-2">
                  <Card className="border p-4">
                    <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
                      <Target className="h-5 w-5 text-[#7A0C2E]" />
                      Task progress
                    </div>
                    <div className="mt-4 space-y-3 text-sm text-neutral-600">
                      <div className="flex items-center justify-between rounded-lg bg-neutral-50 dark:bg-(--semi-card) px-3 py-2 text-foreground">
                        <span>Completed tasks</span>
                        <span className="font-semibold text-(--semi-foreground)">
                          {formatCount(snapshot?.completed_tasks)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-neutral-50 dark:bg-(--semi-card) px-3 py-2 text-foreground">
                        <span>Expected score</span>
                        <span className="font-semibold text-(--semi-foreground)">
                          {formatNumber(snapshot?.expected_score)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-neutral-50 dark:bg-(--semi-card) px-3 py-2 text-foreground">
                        <span>Schedule variance</span>
                        <span className="font-semibold text-(--semi-foreground)">
                          {formatNumber(snapshot?.schedule_variance)}
                        </span>
                      </div>
                    </div>
                  </Card>

                  <Card className="border p-4">
                    <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
                      <CalendarDays className="h-5 w-5 text-[#C9A84C]" />
                      Timeline insight
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-neutral-50 dark:bg-(--semi-card) px-3 py-2">
                      <span>Expected score</span>
                      <span className="font-semibold text-(--semi-foreground)">
                        {formatNumber(snapshot?.expected_score)}
                      </span>
                    </div>
                  </Card>
                </div>

                {/* Extracted TaskTable */}
                <TaskTable
                  tasks={allProjectTasks ?? []}
                  projectId={projectId}
                  isLoading={isTasksLoading}
                  isError={isTasksError}
                />
              </div>
            )}

            {/* Submissions */}
            {activeTab === "submissions" && (
              <div className="mt-6 space-y-6">
                {isTasksLoading && (
                  <Card className="border p-4 text-sm text-neutral-500">
                    Loading submissions...
                  </Card>
                )}

                {!isTasksLoading && isTasksError && (
                  <Card className="border p-4">
                    <p className="text-xs text-rose-600">
                      Couldn't load project submissions.
                    </p>
                  </Card>
                )}

                {!isTasksLoading && !isTasksError && (
                  <>
                    <div className="grid gap-4 lg:grid-cols-2">
                      <Card className="border p-4">
                        <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
                          <ClipboardCheck className="h-5 w-5 text-[#7A0C2E]" />
                          Submission summary
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                          <div className="rounded-lg bg-neutral-50 px-3 py-2 dark:bg-(--semi-card)">
                            <p className="text-xs text-(--semi-foreground)">
                              Total
                            </p>
                            <p className="mt-1 text-lg font-semibold text-foreground">
                              {submittedTasks.length}
                            </p>
                          </div>
                          <div className="rounded-lg bg-neutral-50 px-3 py-2 dark:bg-(--semi-card)">
                            <p className="text-xs text-(--semi-foreground)">
                              Submitted
                            </p>
                            <p className="mt-1 text-lg font-semibold text-foreground">
                              {submittedCount}
                            </p>
                          </div>
                          <div className="rounded-lg bg-neutral-50 px-3 py-2 dark:bg-(--semi-card)">
                            <p className="text-xs text-(--semi-foreground)">
                              Completed
                            </p>
                            <p className="mt-1 text-lg font-semibold text-foreground">
                              {completedCount}
                            </p>
                          </div>
                        </div>
                      </Card>
                    </div>

                    {submittedTasks.length === 0 ? (
                      <Card className="border p-4">
                        <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 p-6 text-center text-sm text-neutral-500 dark:border-(--semi-foreground) dark:bg-card">
                          No submissions yet.
                        </div>
                      </Card>
                    ) : (
                      <div className="grid gap-4 lg:grid-cols-2">
                        {submittedTasks.map((task) => {
                          const submission = getTaskSubmission();
                          const attachmentCount =
                            (submission.files?.length ?? 0) +
                            (submission.links?.length ?? 0);

                          return (
                            <Card key={task.id} className="border p-4">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <h2 className="text-lg font-semibold text-foreground">
                                    {task.name}
                                  </h2>
                                  <p className="mt-2 text-sm text-(--semi-foreground)">
                                    {task.description ||
                                      "No description provided."}
                                  </p>
                                </div>
                                <div className="flex shrink-0 gap-2">
                                  <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold capitalize text-neutral-700 dark:bg-(--semi-card) dark:text-foreground">
                                    {task.category}
                                  </span>
                                  <span
                                    className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                                      task.status === "completed"
                                        ? "bg-emerald-100 text-emerald-700 dark:text-emerald-100"
                                        : "bg-blue-100 text-blue-700 dark:text-blue-100"
                                    }`}
                                  >
                                    {task.status}
                                  </span>
                                </div>
                              </div>

                              <div className="mt-4 space-y-3 text-sm">
                                <div className="flex flex-col gap-1 rounded-lg bg-neutral-50 px-3 py-2 text-foreground dark:bg-(--semi-card)">
                                  <span className="text-xs text-(--semi-foreground)">
                                    Assigned member(s)
                                  </span>
                                  <span>
                                    {task.assigned_members.length > 0
                                      ? task.assigned_members
                                          .map((member) =>
                                            `${member.first_name} ${member.last_name}`.trim(),
                                          )
                                          .join(", ")
                                      : "No members assigned"}
                                  </span>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <div className="rounded-lg bg-neutral-50 px-3 py-2 text-foreground dark:bg-(--semi-card)">
                                    <span className="block text-xs text-(--semi-foreground)">
                                      Deadline
                                    </span>
                                    <span>{formatDate(task.deadline)}</span>
                                  </div>
                                  <div className="rounded-lg bg-neutral-50 px-3 py-2 text-foreground dark:bg-(--semi-card)">
                                    <span className="block text-xs text-(--semi-foreground)">
                                      Completed at
                                    </span>
                                    <span>{formatDate(task.completed_at)}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="mt-4 border-t pt-4">
                                <p className="text-xs font-semibold text-(--semi-foreground)">
                                  Attachments
                                </p>
                                {attachmentCount === 0 ? (
                                  <p className="mt-2 text-sm text-neutral-500">
                                    No attachments
                                  </p>
                                ) : (
                                  <div className="mt-2 space-y-2 text-sm">
                                    {submission.files?.map((file) => (
                                      <a
                                        key={file.url}
                                        href={file.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block text-[#7A0C2E] underline underline-offset-2"
                                      >
                                        {file.name}
                                      </a>
                                    ))}
                                    {submission.links?.map((link) => (
                                      <a
                                        key={link}
                                        href={link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block truncate text-[#7A0C2E] underline underline-offset-2"
                                      >
                                        {getLinkLabel(link)}
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Members */}
            {activeTab === "members" && (
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <Card className="border  p-4">
                  <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
                    <Users className="h-5 w-5 text-[#3F3350]" />
                    Assigned members
                  </div>
                  <div className="mt-4 space-y-3 text-sm text-neutral-600">
                    <div className="flex items-center justify-between rounded-lg bg-neutral-50 dark:bg-(--semi-card) text-foreground px-3 py-2">
                      <span>Project leader</span>
                      <span className="font-semibold text-(--semi-foreground)">
                        {leaderName}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-neutral-50 dark:bg-(--semi-card) text-foreground px-3 py-2">
                      <span>Instructor</span>
                      <span className="font-semibold text-(--semi-foreground)">
                        {instructorName}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-neutral-50 dark:bg-(--semi-card) text-foreground px-3 py-2">
                      <span>Advisor</span>
                      <span className="font-semibold text-(--semi-foreground)">
                        {advisorName}
                      </span>
                    </div>
                  </div>
                  {isMembersError && (
                    <p className="mt-3 text-xs text-rose-600">
                      Couldn't load project members.
                    </p>
                  )}
                </Card>

                <Card className="border p-4">
                  <h2 className="text-lg font-semibold text-foreground">
                    Team status
                  </h2>
                  <p className="mt-4 text-sm text-(--semi-foreground)">
                    Member details can be expanded here as the project grows.
                    For now, the view highlights the assigned instructor,
                    advisor, and project leader from the project's member list.
                  </p>
                </Card>
              </div>
            )}

            {/* Resources */}
            {activeTab === "resources" && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <Files className="h-5 w-5 text-[#7A0C2E]" />
                  Project resources
                </div>

                {RESOURCES.length === 0 ? (
                  <Card className="border p-6 text-center text-sm text-muted-foreground">
                    No project resources have been added yet.
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {RESOURCES.map((resource) => {
                      const categoryMeta = {
                        "Links": {
                          icon: Frame,
                          iconClass:
                            "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
                          barClass: "border-violet-400",
                        },
                        "Paper Files": {
                          icon: FileText,
                          iconClass:
                            "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
                          barClass: "border-blue-400",
                        },
                        Code: {
                          icon: Code2,
                          iconClass:
                            "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
                          barClass: "border-emerald-400",
                        },
                      }[resource.category];

                      const Icon = categoryMeta.icon;

                      return (
                        <Card
                          key={resource.id}
                          className="gap-3 border border-border/70 py-0 transition-all hover:-translate-y-0.5 hover:border-(--maroon)/40 hover:shadow-md"
                        >
                          <CardHeader className="pt-4">
                            <div className="flex items-start gap-3">
                              <span
                                className={cn(
                                  "flex size-9 shrink-0 items-center justify-center rounded-lg",
                                  categoryMeta.iconClass,
                                )}
                              >
                                <Icon className="size-4" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <CardTitle className="line-clamp-2 min-h-10 text-sm font-semibold leading-snug">
                                  {resource.title}
                                </CardTitle>
                              </div>
                              <Badge
                                variant="outline"
                                className="shrink-0 text-[10px]"
                              >
                                {resource.category}
                              </Badge>
                            </div>
                          </CardHeader>

                          <CardContent className="space-y-3 pb-4">
                            <p
                              className={cn(
                                "border-l-2 pl-3 text-sm italic leading-relaxed text-muted-foreground",
                                categoryMeta.barClass,
                              )}
                            >
                              {resource.description}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {resource.type} · {resource.size} ·{" "}
                              {resource.updatedAt}
                            </p>
                          </CardContent>

                          <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-3">
                            <p className="truncate text-xs text-muted-foreground">
                              By {resource.author}
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              type="button"
                              onClick={() => setSelectedResource(resource)}
                            >
                              Open
                              <ArrowRight className="size-3.5" />
                            </Button>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
      <ResourceDialog
        resource={selectedResource}
        open={selectedResource !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedResource(null);
        }}
      />
    </AppLayout>
  );
}

interface TaskSubmissionFile {
  name: string;
  url: string;
}

interface TaskSubmission {
  files?: TaskSubmissionFile[];
  links?: string[];
}

function getTaskSubmission(): TaskSubmission {
  // TODO: Map real submission data here when the submissions API is available.
  return {};
}

function formatDate(value?: string) {
  if (!value) return "No date set";

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function getLinkLabel(link: string) {
  try {
    return new URL(link).hostname;
  } catch {
    return link;
  }
}
