import AppLayout from "@/layouts/Applayout";
import { TriangleAlert } from "lucide-react";
import { TrendingUp } from "lucide-react";
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

// ---------------------------------------------------------------------------
// Types — swap these with your API response shapes when wiring the backend
// ---------------------------------------------------------------------------

type ChartDataPoint = {
  month: string;
  desktop: number;
};

type ActivityColor = "bg-green-500" | "bg-yellow-500" | "bg-red-500";

type RecentActivity = {
  id: number;
  user: string;
  action: string;
  task: string;
  time: string;
  color: ActivityColor;
};

type ProjectHealth = {
  score: number;           // e.g. 72 (percentage)
  label: string;           // e.g. "Project health"
  warningMessage: string;
  suggestions: string[];
};

type ProjectProgress = {
  percentage: number;      // e.g. 72
  completedTasks: number;  // e.g. 18
  totalTasks: number;      // e.g. 30
  onTime: number;          // e.g. 16
  late: number;            // e.g. 2
};

// ---------------------------------------------------------------------------
// Local variables — replace with useState / useEffect / SWR / React Query etc.
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
  desktop: {
    label: "Desktop",
    color: "var(--chart-1)",
  },
};

const projectHealth: ProjectHealth = {
  score: 72,
  label: "Project health",
  warningMessage:
    "Some tasks are approaching deadlines. Monitor workload distribution.",
  suggestions: ["Deadline Adjustment", "Workload Redistribution"],
};

const projectProgress: ProjectProgress = {
  percentage: 72,
  completedTasks: 18,
  totalTasks: 30,
  onTime: 16,
  late: 2,
};

const recentActivities: RecentActivity[] = [
  {
    id: 1,
    user: "Andrea P.",
    action: "completed",
    task: "Database Migration Design",
    time: "5m ago",
    color: "bg-green-500",
  },
  {
    id: 2,
    user: "Harry G.",
    action: "submitted",
    task: "Dashboard UI",
    time: "1d ago",
    color: "bg-yellow-500",
  },
  {
    id: 3,
    user: "Dylan M.",
    action: "completed",
    task: "Website Wireframe",
    time: "2d ago",
    color: "bg-red-500",
  },
  {
    id: 4,
    user: "Rommel G.",
    action: "started",
    task: "Research on Chapter 1",
    time: "4d ago",
    color: "bg-green-500",
  },
  {
    id: 5,
    user: "Clarisa P.",
    action: "started",
    task: "Questionnaire Items",
    time: "5d ago",
    color: "bg-yellow-500",
  },
];

const chartMeta = {
  title: "Bar Chart - Horizontal",
  description: "January - June 2024",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Dashboard() {
  return (
    <>
      <AppLayout
        breadcrumbs={[
          {
            label: "Dashboard",
            href: "/dashboard",
          },
        ]}
      >
        <p className="text-[#000000] pt-2">
          Instructor
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Project Health Banner */}
          <Card className="bg-yellow-50 border shadow-sm border-yellow-200 p-4 rounded-lg lg:col-span-2 flex items-start justify-between">
            {/* Left side */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <TriangleAlert className="h-5 w-5 text-yellow-500" />
                <h2 className="font-semibold text-gray-900">Project Health</h2>
              </div>
              <p className="text-sm text-gray-500">
                {projectHealth.warningMessage}
              </p>
              <p className="text-sm text-gray-600">Suggestions</p>
              <div className="flex gap-2">
                {projectHealth.suggestions.map((suggestion) => (
                  <span
                    key={suggestion}
                    className="rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-600"
                  >
                    {suggestion}
                  </span>
                ))}
              </div>
            </div>
            {/* Right side */}
            <div className="text-right">
              <p className="text-3xl font-bold text-gray-900">
                {projectHealth.score}%
              </p>
              <p className="text-sm text-gray-500">{projectHealth.label}</p>
            </div>
          </Card>

          {/* Project Progress */}
          <Card className="bg-primary-foreground shadow-sm p-4 rounded-lg flex flex-col justify-evenly h-full">
            <div>
              <h2 className="font-semibold text-gray-900">Project Progress</h2>
              <p className="text-sm text-gray-500">
                Overall completion tracking
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700 font-medium">
                  {projectProgress.percentage}%
                </span>
                <span className="text-gray-500">
                  {projectProgress.completedTasks} of {projectProgress.totalTasks} tasks
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-yellow-400"
                  style={{ width: `${projectProgress.percentage}%` }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1 pt-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">ON TIME:</span>
                <span className="text-sm font-bold text-green-500">
                  {projectProgress.onTime}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">LATE:</span>
                <span className="text-sm font-bold text-red-500">
                  {projectProgress.late}
                </span>
              </div>
            </div>
          </Card>

          {/* Bar Chart */}
          <Card className="bg-primary-foreground shadow-sm p-4 rounded-lg">
            <CardHeader>
              <CardTitle>{chartMeta.title}</CardTitle>
              <CardDescription>{chartMeta.description}</CardDescription>
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
                    tickFormatter={(value) => value.slice(0, 3)}
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

          {/* Recent Activity */}
          <Card className="bg-primary-foreground p-6 rounded-2xl lg:col-span-2 shadow-sm border">
            <div className="flex items-center justify-between mb-1">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Recent Activity
                </h2>
                <p className="text-sm text-gray-500">
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
                  className="flex items-start justify-between border-b border-gray-100 pb-4 last:border-none hover:bg-gray-50 rounded-lg px-2 py-2 transition"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`mt-2 h-3 w-3 rounded-full ${activity.color}`}
                    />
                    <div>
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold text-gray-900">
                          {activity.user}
                        </span>{" "}
                        {activity.action}{" "}
                        <span className="font-medium text-black">
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
      </AppLayout>
    </>
  );
}
