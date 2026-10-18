import { useEffect, useMemo, useState } from "react";
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
  PlusCircle,
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
import {
  useGetAllTaskAssignedMembers,
  useGetTasksForReviewer,
} from "@/hooks/useTask";
import { useGetMembersWithUserSnapshot } from "@/hooks/useProjectMember";
import TeamMembersPanel, {
  TeamMembersSkeleton,
} from "@/components/user/TeamMembersPanel";
import { useProjectHealth } from "@/hooks/useProjectHealth";
import { useCurrentUser } from "@/hooks/useAuth";
import { rememberLastVisitedProjects } from "@/lib/lastVisitedProjects";
import { AddTaskDialog } from "@/components/user/AddTaskDialog";

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

const DAY_MS = 86_400_000;

function formatNumber(value?: number | null, digits = 1) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "None";
  }

  return value.toFixed(digits);
}

function formatCount(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "None";
  }

  return `${value}`;
}

/** Whole days from now until the given date (negative if already past). */
function daysUntil(date: string) {
  return Math.ceil((new Date(date).getTime() - Date.now()) / DAY_MS);
}

/**
 * Turns the schedule performance index (earned / planned points) into plain
 * words. Below 1 means behind plan. Thresholds are a starting point; align
 * them with the cutoffs your health scoring uses.
 */
function scheduleLabel(spi?: number | null) {
  if (spi == null) {
    return { text: "Not enough data yet", className: "text-muted-foreground" };
  }

  if (spi >= 1.05) {
    return { text: "Ahead of plan", className: "text-green-600" };
  }

  if (spi >= 0.95) {
    return { text: "On schedule", className: "text-green-600" };
  }

  return {
    text: `${Math.round((1 - spi) * 100)}% behind plan`,
    className: "text-red-500",
  };
}

/* ------------------------------------------------------------------ */
/* Small shared row used inside the Task progress / Timeline cards    */
/* ------------------------------------------------------------------ */

function StatRow({
  label,
  value,
  valueClassName = "",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2 text-foreground dark:bg-(--semi-card)">
      <span>{label}</span>
      <span
        className={`font-semibold text-(--semi-foreground) ${valueClassName}`}
      >
        {value}
      </span>
    </div>
  );
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
  } = useGetTasksForReviewer(userData?.id ?? "", projectId ?? "");

  const {
    data: projectMembersData,
    isLoading: isMembersLoading,
    isError: isMembersError,
  } = useGetMembersWithUserSnapshot(projectId);

  const getMemberName = (role: string) => {
    const member = projectMembersData?.find((m) => m.project_role === role);
    if (!member?.user) return "None";

    const fullName = `${member.user.first_name ?? ""} ${
      member.user.last_name ?? ""
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

  // Task-level numbers for the Tasks tab. Schedule/points figures come from
  // `health.schedule`; this only computes what the health response lacks.
  // NOTE: must stay above the early returns below (hooks can't be conditional).
  const taskStats = useMemo(() => {
    const tasks = allProjectTasks ?? [];
    const now = Date.now();

    const countStatus = (status: string) =>
      tasks.filter((t) => t.status === status).length;

    // Next deadlines: still on the students' plate (not submitted/completed).
    const upcoming = tasks
      .filter(
        (t) =>
          t.deadline && t.status !== "completed" && t.status !== "submitted",
      )
      .filter((t) => new Date(t.deadline).getTime() >= now)
      .sort((a, b) => +new Date(a.deadline) - +new Date(b.deadline))
      .slice(0, 3);

    // Completed tasks per week, oldest -> newest (last 4 weeks).
    const weekly = [3, 2, 1, 0].map((weeksAgo) => {
      const end = now - weeksAgo * 7 * DAY_MS;
      const start = end - 7 * DAY_MS;

      return tasks.filter((t) => {
        if (!t.completed_at) return false;
        const completedAt = new Date(t.completed_at).getTime();
        return completedAt > start && completedAt <= end;
      }).length;
    });

    return {
      notStarted: countStatus("not_started"),
      inProgress: countStatus("in_progress"),
      submitted: countStatus("submitted"),
      completed: countStatus("completed"),
      upcoming,
      weekly,
    };
  }, [allProjectTasks]);

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

  // `applicable` is false when the project has no live tasks; treat as N/A.
  const schedule = health?.schedule.applicable ? health.schedule : null;
  const scheduleStatus = scheduleLabel(schedule?.spi);

  const progressRows: [string, number | null | undefined][] = [
    ["Not started", taskStats.notStarted],
    ["In progress", taskStats.inProgress],
    ["Awaiting review", taskStats.submitted],
    ["Completed", taskStats.completed],
    ["Unassigned", health?.risk.unassigned_count],
  ];

  const timelineRows: [string, number | null | undefined][] = [
    ["Overdue tasks", schedule?.overdue_tasks],
    ["At-risk tasks", schedule?.at_risk_tasks],
    ["Deadline extensions", schedule?.extension_count],
  ];

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
                  {/* Task progress */}
                  <Card className="border p-4">
                    <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
                      <Target className="h-5 w-5 text-[#7A0C2E]" />
                      Task progress
                    </div>

                    {isHealthError ? (
                      <p className="mt-4 text-sm text-rose-600">
                        Couldn't load progress data.
                      </p>
                    ) : isHealthLoading ? (
                      <div className="mt-4 space-y-3">
                        <Skeleton className="h-6 w-full" />
                        <Skeleton className="h-9 w-full" />
                        <Skeleton className="h-9 w-full" />
                      </div>
                    ) : (
                      <>
                        {/* Points-weighted progress bar */}
                        <div className="mt-4">
                          <div className="mb-1 flex justify-between text-sm text-foreground">
                            <span>
                              {schedule
                                ? `${formatNumber(
                                    schedule.completed_points,
                                    0,
                                  )} of ${formatNumber(
                                    schedule.total_points,
                                    0,
                                  )} points completed`
                                : "Points completed"}
                            </span>

                            <span className="font-semibold">
                              {schedule?.completion_pct != null
                                ? `${Math.round(schedule.completion_pct)}%`
                                : "N/A"}
                            </span>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-(--semi-card)">
                            <div
                              className="h-full rounded-full bg-[#7A0C2E]"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.max(0, schedule?.completion_pct ?? 0),
                                )}%`,
                              }}
                            />
                          </div>

                          {schedule && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatNumber(schedule.remaining_points, 0)}{" "}
                              points remaining
                            </p>
                          )}
                        </div>

                        {/* Status breakdown */}
                        <div className="mt-4 space-y-3 text-sm text-neutral-600">
                          {progressRows.map(([label, value]) => (
                            <StatRow
                              key={label}
                              label={label}
                              value={formatCount(value)}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </Card>

                  {/* Timeline insight */}
                  <Card className="border p-4">
                    <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
                      <CalendarDays className="h-5 w-5 text-[#C9A84C]" />
                      Timeline insight
                    </div>

                    {isHealthError ? (
                      <p className="mt-4 text-sm text-rose-600">
                        Couldn't load schedule data.
                      </p>
                    ) : isHealthLoading ? (
                      <div className="mt-4 space-y-3">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-9 w-full" />
                        <Skeleton className="h-9 w-full" />
                      </div>
                    ) : (
                      <>
                        <p
                          className={`mt-4 text-sm font-semibold ${scheduleStatus.className}`}
                        >
                          {scheduleStatus.text}
                        </p>

                        <div className="mt-3 space-y-3 text-sm text-neutral-600">
                          {timelineRows.map(([label, value]) => (
                            <StatRow
                              key={label}
                              label={label}
                              value={formatCount(value)}
                              valueClassName={
                                label === "Overdue tasks" && (value ?? 0) > 0
                                  ? "text-red-500"
                                  : ""
                              }
                            />
                          ))}
                        </div>

                        {/* Next deadlines */}
                        <p className="mt-4 text-xs font-medium text-muted-foreground">
                          Next deadlines
                        </p>
                        <div className="mt-2 space-y-1 text-sm text-foreground">
                          {isTasksLoading ? (
                            <Skeleton className="h-5 w-full" />
                          ) : taskStats.upcoming.length === 0 ? (
                            <p className="text-muted-foreground">
                              No upcoming deadlines.
                            </p>
                          ) : (
                            taskStats.upcoming.map((task) => (
                              <div
                                key={task.id}
                                className="flex justify-between gap-2"
                              >
                                <span className="truncate">{task.name}</span>
                                <span className="shrink-0 text-muted-foreground">
                                  {daysUntil(task.deadline) === 0
                                    ? "today"
                                    : `in ${daysUntil(task.deadline)}d`}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </>
                    )}
                  </Card>
                </div>

                <div className="flex justify-end">
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
              <div className="mt-6">
                {isMembersLoading ? (
                  <TeamMembersSkeleton />
                ) : isMembersError ? (
                  <p className="text-sm text-rose-600">
                    Couldn't load project members.
                  </p>
                ) : (
                  <TeamMembersPanel
                    members={projectMembersData ?? []}
                    tasks={allProjectTasks ?? []}
                    isTasksLoading={isTasksLoading}
                    isTasksError={isTasksError}
                    currentUserId={userData?.id ?? ""}
                  />
                )}
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