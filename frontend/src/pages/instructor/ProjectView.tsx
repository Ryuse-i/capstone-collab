import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  ClipboardCheck,
  Files,
  Target,
  Users,
} from "lucide-react";

import AppLayout from "@/layouts/Applayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { TaskTable } from "@/components/user/TaskTable";
import { SubmissionsTable } from "@/components/user/SubmissionTable";
import ProjectResourcesPanel from "@/components/user/ProjectResourcesPanel";
import ProjectOverview, {
  healthBadgeClasses,
  healthStatusLabel,
} from "@/components/user/ProjectOverview";
import { useGetOneProjectWithSpanshot } from "@/hooks/useProject";
import { useGetAllTaskAssignedMembers, useGetTasksForReviewer } from "@/hooks/useTask";
import { useGetMembersWithUserInfo } from "@/hooks/useProjectMember";
import { useProjectHealth } from "@/hooks/useProjectHealth";
import { useCurrentUser } from "@/hooks/useAuth";
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

/* ------------------------------------------------------------------ */
/* Project View Skeleton                                              */
/* ------------------------------------------------------------------ */

function ProjectViewSkeleton() {
  return (
    <AppLayout breadcrumbs={[{ label: "Projects", href: "/project-list" }]}>
      <div className="min-h-screen w-full py-2">
        <Skeleton className="mb-5 h-5 w-32" />

        <Card className="overflow-hidden border shadow-sm">
          {/* Project Header */}
          <div className="m-2 rounded-lg border-4 border-neutral-200 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-3">
                <Skeleton className="h-8 w-72" />

                <Skeleton className="h-4 w-lg max-w-full" />

                <Skeleton className="h-4 w-80 max-w-full" />
              </div>

              <div className="flex gap-2">
                <Skeleton className="h-7 w-20 rounded-full" />
                <Skeleton className="h-7 w-28 rounded-full" />
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Tabs */}
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-9 w-24 rounded-md" />
              ))}
            </div>

            {/* Overview */}
            <div className="mt-6 space-y-6">
              {/* Overview cards */}
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="rounded-2xl border bg-card p-4">
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="mt-4 h-8 w-24" />
                    <Skeleton className="mt-2 h-4 w-32" />
                  </div>
                ))}
              </div>

              {/* Details + Contacts */}
              <div className="grid gap-4 lg:grid-cols-2">
                {Array.from({ length: 2 }).map((_, index) => (
                  <Card key={index} className="border p-4">
                    <Skeleton className="h-6 w-32" />

                    <div className="mt-4 space-y-3">
                      {Array.from({ length: 3 }).map((_, rowIndex) => (
                        <div
                          key={rowIndex}
                          className="flex items-center justify-between rounded-lg bg-neutral-50 p-2 dark:bg-(--semi-card)"
                        >
                          <Skeleton className="h-4 w-28" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}

export default function ProjectView() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [activeTab, setActiveTab] = useState<ProjectViewTab>("overview");

  const projectId = id ?? "";

  useEffect(() => {
    if (projectId) {
      rememberLastVisitedProjects(`/view-project/${projectId}`);
    }
  }, [projectId]);

  // Fetch current user data
  const userQuery = useCurrentUser();
  const { data: userData } = userQuery;

  const {
    data: project,
    isLoading,
    isError,
  } = useGetOneProjectWithSpanshot(projectId);

  const snapshot = project?.snapshot;

  // Health loads on its own so a slow or failing health call only affects
  // the health sections, not the whole page.
  const {
    data: health,
    isLoading: isHealthLoading,
    isError: isHealthError,
  } = useProjectHealth(projectId);

  const {
    data: allProjectTasks,
    isLoading: isTasksLoading,
    isError: isTasksError,
  } = useGetAllTaskAssignedMembers(projectId);

  // Fetch reviewer tasks for submissions tab
  const {
    data: reviewerTasks,
    isLoading: isReviewerTasksLoading,
    isError: isReviewerTasksError,
  } = useGetTasksForReviewer(userData?.id ?? "");

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

    if (!member || !member.users) {
      return "None";
    }

    const fullName = `${member.users.first_name ?? ""} ${
      member.users.last_name ?? ""
    }`.trim();

    return fullName || "None";
  };

  const { leaderName, advisorName, instructorName } = (() => {
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
  })();

  if (isLoading) {
    return <ProjectViewSkeleton />;
  }

  if (isError || !project) {
    return (
      <AppLayout breadcrumbs={[{ label: "Projects", href: "/project-list" }]}>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <button
              onClick={() => navigate("/project-list")}
              className="mb-4 flex items-center gap-2 text-sm font-medium text-[#7A0C2E]"
            >
              <ArrowLeft size={16} />
              Back to projects
            </button>

            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border-b-2 border-destructive">
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
        { label: project.name },
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

        <Card className="overflow-hidden border shadow-sm bg-background">
          {/* Project Header */}
          <div className="m-2 rounded-lg border-4 border-neutral-200 p-6">
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
                  className={`rounded-full px-3 py-1 text-sm font-semibold bg-card dark:ring-1 ring-foreground/10 ${healthBadgeClasses(
                    health?.status,
                  )}`}
                >
                  {health ? healthStatusLabel[health.status] : "Unknown"}
                </span>

                <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-[#7A0C2E] shadow-sm dark:bg-card dark:ring-1 ring-foreground/10">
                  {health?.schedule.completion_pct != null
                    ? `${Math.round(health.schedule.completion_pct)}%`
                    : "N/A"}{" "}
                  progress
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
              <ProjectOverview
                health={health}
                isHealthLoading={isHealthLoading}
                isHealthError={isHealthError}
                workloadBalance={snapshot?.workload_balance}
                imbalanceSeverity={snapshot?.imbalance_severity}
                totalWorkloadPoints={snapshot?.total_workload_points}
                tasks={allProjectTasks ?? []}
                isTasksLoading={isTasksLoading}
                projectId={projectId}
                leaderName={leaderName}
                instructorName={instructorName}
                advisorName={advisorName}
              />
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
                      <div className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2 text-foreground dark:bg-(--semi-card)">
                        <span>Completed tasks</span>

                        <span className="font-semibold text-(--semi-foreground)">
                          {formatCount(snapshot?.completed_tasks)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2 text-foreground dark:bg-(--semi-card)">
                        <span>Expected score</span>

                        <span className="font-semibold text-(--semi-foreground)">
                          {formatNumber(snapshot?.expected_score)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2 text-foreground dark:bg-(--semi-card)">
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

                    <div className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2 dark:bg-(--semi-card)">
                      <span>Expected score</span>

                      <span className="font-semibold text-(--semi-foreground)">
                        {formatNumber(snapshot?.expected_score)}
                      </span>
                    </div>
                  </Card>
                </div>

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
              <SubmissionsTable
                tasks={reviewerTasks ?? []}
                isLoading={isReviewerTasksLoading}
                isError={isReviewerTasksError}
              />
            )}

            {/* Members */}
            {activeTab === "members" && (
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <Card className="border p-4">
                  <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
                    <Users className="h-5 w-5 text-[#3F3350]" />
                    Assigned members
                  </div>

                  <div className="mt-4 space-y-3 text-sm text-neutral-600">
                    <div className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2 text-foreground dark:bg-(--semi-card)">
                      <span>Project leader</span>

                      <span className="font-semibold text-(--semi-foreground)">
                        {leaderName}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2 text-foreground dark:bg-(--semi-card)">
                      <span>Instructor</span>

                      <span className="font-semibold text-(--semi-foreground)">
                        {instructorName}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2 text-foreground dark:bg-(--semi-card)">
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
              <ProjectResourcesPanel
                projectId={projectId}
                projectName={project?.name}
                projectLoading={isLoading}
                projectError={isError}
                withLayout={false}
              />
            )}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}