import AppLayout from "@/layouts/Applayout";
import GetStartedPage from "@/components/user/GetStartedPage";
import { TriangleAlert, TrendingUp } from "lucide-react";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

import { useGetCurrentProject } from "@/hooks/useProject";
import { useCurrentUser } from "@/hooks/useAuth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ChartDataPoint = { month: string; desktop: number };
type ActivityColor = "bg-green-500" | "bg-yellow-500" | "bg-red-500";
type TextColor = "text-green-500" | "text-yellow-500" | "text-red-500";
type RecentActivity = {
  id: number;
  user: string;
  action: string;
  task: string;
  time: string;
  color: ActivityColor;
  text: TextColor; // Optional text color for the action
};

// ---------------------------------------------------------------------------
// Static chart data (replace with API data when available)
// ---------------------------------------------------------------------------

const chartData: ChartDataPoint[] = [
  { month: "January", desktop: 186 },
  { month: "February", desktop: 305 },
  { month: "March", desktop: 237 },
  { month: "April", desktop: 73 },
  { month: "May", desktop: 209 },
  { month: "June", desktop: 214 },
];

const chartConfig: ChartConfig = {
  desktop: { label: "Desktop", color: "var(--chart-1)" },
};

const recentActivities: RecentActivity[] = [
  {
    id: 1,
    user: "Andrea P.",
    action: "completed",
    task: "Database Migration Design",
    time: "5m ago",
    color: "bg-green-500",
    text: "text-green-500",
  },
  {
    id: 2,
    user: "Harry G.",
    action: "submitted",
    task: "Dashboard UI",
    time: "1d ago",
    color: "bg-yellow-500",
    text: "text-yellow-500",
  },
  {
    id: 3,
    user: "Dylan M.",
    action: "completed",
    task: "Website Wireframe",
    time: "2d ago",
    color: "bg-red-500",
    text: "text-red-500",
  },
  {
    id: 4,
    user: "Rommel G.",
    action: "started",
    task: "Research on Chapter 1",
    time: "4d ago",
    color: "bg-green-500",
    text: "text-green-500",
  },
  {
    id: 5,
    user: "Clarisa P.",
    action: "started",
    task: "Questionnaire Items",
    time: "5d ago",
    color: "bg-yellow-500",
    text: "text-yellow-500",
  },
];

// ---------------------------------------------------------------------------
// TODO: Replace with real hook (e.g. useProject / useDashboard) when ready
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Dashboard() {
  const { data: user } = useCurrentUser();
  const {
    data: currentProject,
    isLoading,
    isError,
    error,
  } = useGetCurrentProject(user?.id ?? "");

  if (isError) {
    console.error("Dashboard project error", error);
  }

  const hasProject = Boolean(currentProject);

  const healthScore = currentProject?.snapshot?.health_score ?? 0;
  const healthStatus = currentProject?.snapshot?.health_status ?? "healthy";
  const scheduleVariance = currentProject?.snapshot?.schedule_variance ?? 0;
  const isAtRisk = scheduleVariance < 0 || healthStatus !== "healthy";
  const progressPercentage = currentProject?.snapshot?.progress_percentage ?? 0;
  const completedTasks = currentProject?.snapshot?.completed_tasks ?? 0;
  const totalWorkload = currentProject?.snapshot?.total_workload_points ?? 0;
  const expectedPercentage = currentProject?.snapshot?.expected_percentage ?? 0;

  return (
    <AppLayout breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }]}>
      {isLoading ? (
        // Loading state
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-400 text-sm animate-pulse">
            Loading your project…
          </p>
        </div>
      ) : !hasProject ? (
        // No project yet → show onboarding
        <GetStartedPage />
      ) : (
        // Active project → show analytics
        <div>
          <h1 className="text-(--text-h) text-2xl font-bold dark:text-card-foreground mb-2">
            Overview of project health and team performance
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* ── Project Health Banner ─────────────────────────────── */}
            <Card
              className={`border-4 p-4 rounded-lg lg:col-span-2 flex items-start justify-between ${
                isAtRisk
                  ? "border-red-500 dark:border-red-500"
                  : "border-yellow-500 dark:border-yellow-500"
              }`}
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <TriangleAlert
                    className={`h-5 w-5 ${isAtRisk ? "text-red-500" : "text-yellow-500"}`}
                  />
                  <h2
                    className={`font-semibold ${
                      isAtRisk
                        ? "text-red-700 dark:text-red-500"
                        : "text-gray-900 dark:text-yellow-500"
                    }`}
                  >
                    {isAtRisk
                      ? "Project Health Alert"
                      : "Project Health On Track"}
                  </h2>
                </div>
                <p className="text-sm text-gray-500 dark:text-card-foreground">
                  {isAtRisk
                    ? "Some tasks are approaching deadlines. Monitor workload distribution."
                    : "Project is on track. Keep up the great work!"}
                </p>
                <p className="text-sm text-gray-600 dark:text-card-foreground">
                  Status
                </p>
                <div className="flex gap-2 flex-wrap">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs capitalize ${
                      isAtRisk
                        ? "border-red-600 text-red-600"
                        : "border-gray-300 text-gray-600 dark:text-card-foreground"
                    }`}
                  >
                    {healthStatus}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-900 dark:text-card-foreground">
                  {Number(healthScore).toFixed(0)}%
                </p>
                <p className="text-sm text-gray-500 dark:text-(--semi-foreground)">
                  Project health
                </p>
              </div>
            </Card>

            {/* ── Project Progress ──────────────────────────────────── */}
            <Card className="bg-primary-foreground shadow-sm p-4 rounded-lg flex flex-col justify-evenly h-full">
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-card-foreground">
                  {currentProject?.name}
                </h2>
                <p className="text-sm text-gray-500 dark:text-(--semi-foreground)">
                  Overall completion tracking
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 font-medium dark:text-card-foreground">
                    {progressPercentage}%
                  </span>
                  <span className="text-gray-500 dark:text-card-foreground">
                    {Number(completedTasks).toFixed(0)} pts / {totalWorkload}{" "}
                    total
                  </span>
                </div>
                {/* FIX: was "w-fullrounded-full" (missing space), an invalid
                    Tailwind class that silently did nothing */}
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-yellow-400 transition-all duration-500"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1 pt-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 dark:text-card-foreground">
                    EXPECTED SCORE:
                  </span>
                  <span className="text-sm font-bold text-green-500">
                    {expectedPercentage ?? 0}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 dark:text-card-foreground">
                    SCHEDULE VARIANCE:
                  </span>
                  <span
                    className={`text-sm font-bold ${
                      Number(scheduleVariance) >= 0
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
                  >
                    {Number(scheduleVariance).toFixed(2)}
                  </span>
                </div>
              </div>
            </Card>

            {/* ── Bar Chart (static for now) ────────────────────────── */}
            <Card className="bg-primary-foreground shadow-sm p-4 rounded-lg">
              <CardHeader>
                <CardTitle>Bar Chart - Horizontal</CardTitle>
                <CardDescription>January - June 2024</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig}>
                  <BarChart
                    accessibilityLayer
                    data={chartData}
                    layout="vertical"
                    margin={{ left: -20 }}
                  >
                    <XAxis type="number" dataKey="desktop" hide />
                    <YAxis
                      dataKey="month"
                      type="category"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                      tickFormatter={(v) => v.slice(0, 3)}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel />}
                    />
                    <Bar
                      dataKey="desktop"
                      fill="var(--color-desktop)"
                      radius={5}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* ── Recent Activity ───────────────────────────────────── */}
            <Card className="bg-primary-foreground p-6 rounded-2xl lg:col-span-2 shadow-sm border">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-card-foreground">
                    Recent Activity
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-(--semi-foreground)">
                    Latest team updates and progress
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-green-600 font-medium bg-green-50 px-3 py-1 rounded-full">
                  <TrendingUp className="h-4 w-4" />
                  Active Team
                </div>
              </div>

              <div className="space-y-1">
                {recentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start justify-between border-b border-gray-100 pb-4 last:border-none hover:bg-gray-200 dark:hover:bg-[#303233] rounded-lg px-2 py-2 transition"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`mt-2 h-3 w-3 rounded-full ${activity.color}`}
                      />
                      <div>
                        <p className="text-sm text-gray-700 dark:text-(--semi-foreground)">
                          <span className="font-semibold text-gray-900 dark:text-card-foreground">
                            {activity.user}
                          </span>{" "}
                          <span className={`${activity.text} font-semibold`}>
                            {activity.action}
                          </span>{" "}
                          <span className="font-medium text-black dark:text-card-foreground">
                            {activity.task}
                          </span>
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Team collaboration update
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {activity.time}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
