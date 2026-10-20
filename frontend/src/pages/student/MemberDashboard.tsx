import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Clock,
  Loader2,
  Target,
  User,
  Users,
} from "lucide-react";

import AppLayout from "@/layouts/Applayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MyTaskDialog } from "@/components/user/MyTaskDialog";
import type { TaskResponseMembers } from "@/types/task";
import {
  useGetTasksForUser,
} from "@/hooks/useTask";
import { useCurrentUser } from "@/hooks/useAuth";
import { useGetCurrentProject } from "@/hooks/useProject";
import { useGetMembersWithUserSnapshot } from "@/hooks/useProjectMember";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

const ROUTES = {
  myTasks: "/mytask",
};

// Project roles that supervise the project but aren't shown as team members.
const NON_MEMBER_ROLES = ["instructor", "advisor"];

// ---------------------------------------------------------------------------
// Style tokens (shared with the main project Dashboard)
// ---------------------------------------------------------------------------

const urgencyStyles = {
  overdue: {
    badge: "border-red-600 text-red-600",
    dot: "bg-red-500",
  },
  soon: {
    badge: "border-yellow-600 text-yellow-600",
    dot: "bg-yellow-400",
  },
  submitted: {
    badge: "border-green-600 text-green-600",
    dot: "bg-green-500",
  },
} as const;

const workloadStyles: Record<string, { badge: string }> = {
  overloaded: { badge: "border-red-600 text-red-600" },
  underutilized: { badge: "border-yellow-600 text-yellow-600" },
  normal: { badge: "border-green-600 text-green-600" },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type TaskUrgency = "overdue" | "soon" | "submitted";

function getDeadlineUrgency(task: TaskResponseMembers): TaskUrgency | null {
  if (!task.deadline || task.status === "completed") return null;

  const deadline = new Date(task.deadline);
  const now = new Date();
  if (Number.isNaN(deadline.getTime())) return null;
  if (deadline < now) return "overdue";

  const dueIn7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return deadline <= dueIn7Days ? "soon" : null;
}

function formatDeadline(deadline: string | null | undefined): string {
  if (!deadline) return "No deadline";
  try {
    return new Date(deadline).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "No deadline";
  }
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

// ---------------------------------------------------------------------------
// Section A: Personal Overview stats
// ---------------------------------------------------------------------------

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg,
  iconColor,
  valueColor,
}: {
  title: string;
  value: number | string;
  subtitle: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  valueColor: string;
}) {
  return (
    <Card className="gap-2 rounded-lg p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-gray-500 dark:text-(--semi-foreground)">
            {title}
          </p>
          <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
        </div>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}
        >
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
      <p className="text-xs text-gray-500 dark:text-(--semi-foreground)">
        {subtitle}
      </p>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Section B: Currently Working On
// ---------------------------------------------------------------------------

function CurrentTaskCard({
  className,
  task,
  openTask,
}: {
  className?: string;
  task: TaskResponseMembers | null;
  openTask: (task: TaskResponseMembers) => void;
}) {
  if (!task) {
    return (
      <Card className={cn("flex h-full flex-col rounded-lg p-4 shadow-sm", className)}>
        <div>
          <h2 className="font-semibold text-foreground dark:text-card-foreground">
            Currently Working On
          </h2>
          <p className="text-sm text-gray-500 dark:text-(--semi-foreground)">
            No in-progress tasks
          </p>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
          <Users className="mb-2 h-8 w-8 text-blue-500" />
          <p className="text-sm text-gray-500 dark:text-(--semi-foreground)">
            You don't have any tasks in progress right now.
          </p>
        </div>
        <div className="flex justify-center">
          <Button asChild variant="outline" size="sm">
            <Link to={ROUTES.myTasks}>View all my tasks</Link>
          </Button>
        </div>
      </Card>
    );
  }

  const urgency = getDeadlineUrgency(task);
  const collaborators = (task.assigned_members ?? [])
    .map((m) => `${m.first_name} ${m.last_name || ""}`.trim())
    .filter(Boolean)
    .filter((name) => name !== "");

  return (
    <Card className={cn("flex h-full flex-col rounded-lg p-4 shadow-sm", className)}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold text-foreground dark:text-card-foreground">
            Currently Working On
          </h2>
          <p className="text-sm text-gray-500 dark:text-(--semi-foreground)">
            Your next in-progress task
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full border px-3 py-1 text-xs",
            urgency === "overdue"
              ? urgencyStyles.overdue.badge
              : "border-yellow-600 text-yellow-600",
          )}
        >
          {task.status
            ? task.status.charAt(0).toUpperCase() +
              task.status.slice(1).replace("_", " ")
            : "Unknown"}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 pt-4">
        <h3 className="font-semibold leading-snug text-foreground">
          {task.name}
        </h3>
        {task.description && (
          <p className="line-clamp-2 text-sm text-gray-500 dark:text-(--semi-foreground)">
            {task.description}
          </p>
        )}
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border px-3 py-1 text-gray-700 dark:text-card-foreground">
            Priority:{" "}
            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
          </span>
          {task.deadline && (
            <span
              className={cn(
                "rounded-full border px-3 py-1",
                urgency === "overdue"
                  ? urgencyStyles.overdue.badge
                  : urgency === "soon"
                    ? urgencyStyles.soon.badge
                    : "text-gray-700 dark:text-card-foreground",
              )}
            >
              {formatDeadline(task.deadline)}
            </span>
          )}
        </div>
        {collaborators.length > 0 && (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-blue-500" />
            <span className="text-sm text-gray-500 dark:text-(--semi-foreground)">
              {collaborators.join(", ")}
            </span>
          </div>
        )}
      </div>

      <div className="flex justify-center pt-2">
        <Button variant="outline" size="sm" onClick={() => openTask(task)}>
          Open task{" "}
          <ArrowRight className="ml-1 size-3.5 text-(--maroon) dark:text-pink-300" />
        </Button>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Section C: Upcoming Deadlines / Needs Attention
// ---------------------------------------------------------------------------

function AttentionList({
  className,
  items,
  openTask,
}: {
  className?: string;
  items: Array<{ task: TaskResponseMembers; type: TaskUrgency }>;
  openTask: (task: TaskResponseMembers) => void;
}) {
  if (items.length === 0) {
    return (
      <Card className={cn("flex h-full flex-col rounded-lg p-4 shadow-sm", className)}>
        <div>
          <h2 className="font-semibold text-foreground dark:text-card-foreground">
            Needs Your Attention
          </h2>
          <p className="text-sm text-gray-500 dark:text-(--semi-foreground)">
            Overdue, upcoming and awaiting review
          </p>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
          <Check className="mb-2 h-8 w-8 text-green-500" />
          <p className="text-sm text-gray-500 dark:text-(--semi-foreground)">
            No overdue, upcoming, or awaiting-review tasks.
          </p>
        </div>
        <div className="flex justify-center">
          <Button asChild variant="outline" size="sm">
            <Link to={ROUTES.myTasks}>View all my tasks</Link>
          </Button>
        </div>
      </Card>
    );
  }

  const typeLabel: Record<TaskUrgency, string> = {
    overdue: "Overdue",
    soon: "Due soon",
    submitted: "Awaiting review",
  };

  return (
    <Card className={cn("flex h-full flex-col rounded-lg p-4 shadow-sm", className)}>
      <div>
        <h2 className="font-semibold text-foreground dark:text-card-foreground">
          Needs Your Attention
        </h2>
        <p className="text-sm text-gray-500 dark:text-(--semi-foreground)">
          Overdue, upcoming and awaiting review
        </p>
      </div>

      <div className="flex-1 space-y-1 pt-2">
        {items.map(({ task, type }) => (
          <div
            key={task.id}
            className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm transition hover:bg-gray-200 dark:hover:bg-[#303233]"
            onClick={() => openTask(task)}
          >
            <div className="flex min-w-0 items-center gap-3">
              <span
                className={`h-3 w-3 shrink-0 rounded-full ${urgencyStyles[type].dot}`}
              />
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate font-medium text-gray-700 dark:text-card-foreground">
                  {task.name}
                </span>
                <span className="truncate text-xs text-gray-500 dark:text-(--semi-foreground)">
                  {formatDeadline(task.deadline)}
                </span>
              </div>
            </div>
            <span
              className={`shrink-0 rounded-full border px-3 py-1 text-xs ${urgencyStyles[type].badge}`}
            >
              {typeLabel[type]}
            </span>
          </div>
        ))}
      </div>

      <div className="flex justify-center pt-2">
        <Button asChild variant="outline" size="sm">
          <Link to={ROUTES.myTasks}>View all tasks</Link>
        </Button>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Section D: Project Team Overview
// ---------------------------------------------------------------------------

type TeamMember = {
  id: string;
  name: string;
  initials: string;
  role: string;
  workloadStatus: string | null;
  isCurrent: boolean;
};

function TeamMemberRow({
  member,
}: {
  member: TeamMember;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition hover:bg-gray-200 dark:hover:bg-[#303233]">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback
            className={
              member.isCurrent
                ? "bg-(--maroon) text-white"
                : "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
            }
          >
            {member.initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium text-card-foreground">
              {member.name}
            </span>
            {member.isCurrent && (
              <span className="rounded-full bg-(--maroon) px-2 py-0.5 text-[10px] font-medium text-white">
                You
              </span>
            )}
          </div>
          <p className="truncate text-xs text-gray-500 dark:text-(--semi-foreground)">
            {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
          </p>
        </div>
      </div>
      {member.workloadStatus && (
        <span
          className={cn(
            "shrink-0 rounded-full border px-3 py-1 text-xs capitalize",
            (workloadStyles[member.workloadStatus] ?? workloadStyles.normal)
              .badge,
          )}
        >
          {member.workloadStatus}
        </span>
      )}
    </div>
  );
}

function TeamOverview({
  className,
  members,
}: {
  className?: string;
  members: Array<{
    id: string;
    name: string;
    initials: string;
    role: string;
    workloadStatus: string | null;
    isCurrent: boolean;
  }>;
}) {
  const currentMember = members.find((m) => m.isCurrent);
  const otherMembers = members.filter((m) => !m.isCurrent);

  return (
    <Card className={cn("flex h-full flex-col rounded-lg p-4 shadow-sm", className)}>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-semibold text-foreground dark:text-card-foreground">
            Project Team
          </h2>
          <p className="text-sm text-gray-500 dark:text-(--semi-foreground)">
            {members.length} members
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-1 pt-2">
        {currentMember ? <TeamMemberRow member={currentMember} /> : null}
        {otherMembers.map((member) => (
          <TeamMemberRow key={member.id} member={member} />
        ))}
        {members.length === 0 && (
          <p className="py-2 text-center text-sm text-muted-foreground">
            No team members found.
          </p>
        )}
      </div>

    </Card>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MemberDashboard() {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const [openTaskDialog, setOpenTaskDialog] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const {
    data: currentProject,
    isPending: isProjectPending,
  } = useGetCurrentProject(user?.id ?? "");

  const { data: members = [], isPending: isMembersPending } =
    useGetMembersWithUserSnapshot(currentProject?.id ?? "");

  const {
    data: tasks = [],
    isLoading: isTasksLoading,
  } = useGetTasksForUser(user?.id ?? "");


  const isLoading =
    userLoading || isProjectPending || isMembersPending || isTasksLoading;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!currentProject || !user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <Clock className="h-8 w-8 text-yellow-500" />
        <p className="text-foreground dark:text-muted-foreground">
          You are not currently assigned to a project.
        </p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Section A: Personal Overview stats
  // ---------------------------------------------------------------------------

  const totalAssigned = tasks.length;
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const submittedCount = tasks.filter((t) => t.status === "submitted").length;
  const notStartedCount = tasks.filter((t) => t.status === "not_started").length;
  const completionPct =
    totalAssigned > 0 ? Math.round((completedCount / totalAssigned) * 100) : 0;

  // ---------------------------------------------------------------------------
  // Section B: Currently Working On
  // ---------------------------------------------------------------------------

  const inProgressTasks = tasks.filter((t) => t.status === "in_progress");
  const currentTask = inProgressTasks
    .slice()
    .sort((a, b) => {
      const aDate = a.deadline ? new Date(a.deadline).getTime() : Infinity;
      const bDate = b.deadline ? new Date(b.deadline).getTime() : Infinity;
      return aDate - bDate;
    })[0]
    ?? null;

  // ---------------------------------------------------------------------------
  // Section C: Needs Attention
  // ---------------------------------------------------------------------------

  const now = new Date();
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const attentionItems: Array<{ task: TaskResponseMembers; type: TaskUrgency }> = [];

  tasks.forEach((t) => {
    if (t.status === "submitted") {
      attentionItems.push({ task: t, type: "submitted" });
      return;
    }
    if (t.status === "completed" || !t.deadline) return;
    const deadline = new Date(t.deadline);
    if (deadline < now) {
      attentionItems.push({ task: t, type: "overdue" });
    } else if (deadline <= sevenDaysLater) {
      attentionItems.push({ task: t, type: "soon" });
    }
  });

  // ---------------------------------------------------------------------------
  // Section D: Project Team Overview
  // ---------------------------------------------------------------------------

  const teamMembers = members
    .filter(
      (member) =>
        !NON_MEMBER_ROLES.includes(member.project_role?.toLowerCase() ?? ""),
    )
    .map((member) => ({
      id: member.id,
      name: `${member.user.first_name} ${member.user.last_name}`.trim(),
      initials: getInitials(member.user.first_name, member.user.last_name),
      role: member.project_role,
      workloadStatus: member.snapshots[0]?.workload_status ?? null,
      isCurrent: member.user_id === user.id,
    }));

  // ---------------------------------------------------------------------------
  // Section E: Recent Activity (already mapped by useGetMemberActivities)
  // ---------------------------------------------------------------------------

  const taskForDialog =
    tasks.find((t) => t.id === selectedTaskId) ?? null;

  return (
    <AppLayout breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }]}>
      <div>
        {/* Header */}
        <div className="my-2 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-(--text-h) dark:text-card-foreground">
              My Dashboard
            </h1>
            <p className="text-sm text-gray-500 dark:text-(--semi-foreground)">
              Your personal work overview for <b>{currentProject.name}</b>
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to={ROUTES.myTasks}>View all my tasks</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* ── Personal Overview Stats ──────────────────────────────── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-3 lg:grid-cols-4">
            <StatCard
              title="Total Assigned"
              value={totalAssigned}
              subtitle="All tasks assigned to you"
              icon={Users}
              iconBg="bg-blue-100 dark:bg-blue-500/20"
              iconColor="text-blue-600 dark:text-blue-400"
              valueColor="text-blue-600 dark:text-blue-400"
            />
            <StatCard
              title="In Progress"
              value={inProgressCount}
              subtitle="Tasks you are currently working on"
              icon={Clock}
              iconBg="bg-yellow-100 dark:bg-yellow-500/20"
              iconColor="text-yellow-600 dark:text-yellow-400"
              valueColor="text-yellow-600 dark:text-yellow-400"
            />
            <StatCard
              title="Completed"
              value={completedCount}
              subtitle="Finished tasks"
              icon={Check}
              iconBg="bg-green-100 dark:bg-green-500/20"
              iconColor="text-green-600 dark:text-green-400"
              valueColor="text-green-600 dark:text-green-400"
            />
            <StatCard
              title="Completion"
              value={`${completionPct}%`}
              subtitle={`${notStartedCount} not started · ${submittedCount} awaiting review`}
              icon={Target}
              iconBg="bg-(--maroon)/10 dark:bg-white/10"
              iconColor="text-(--maroon) dark:text-pink-300"
              valueColor="text-(--maroon) dark:text-pink-300"
            />
          </div>

          {/* ── Currently Working On ─────────────────────────────────── */}
          <CurrentTaskCard
            task={currentTask}
            openTask={(task) => {
              setSelectedTaskId(task.id);
              setOpenTaskDialog(true);
            }}
          />

          {/* ── Needs Attention ──────────────────────────────────────── */}
          <AttentionList
            items={attentionItems}
            openTask={(task) => {
              setSelectedTaskId(task.id);
              setOpenTaskDialog(true);
            }}
          />

          {/* ── Project Team Overview ────────────────────────────────── */}
          <TeamOverview members={teamMembers} />
        </div>
      </div>

      <MyTaskDialog
        open={openTaskDialog}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTaskId(null);
          }
          setOpenTaskDialog(open);
        }}
        task={taskForDialog}
      />
    </AppLayout>
  );
}