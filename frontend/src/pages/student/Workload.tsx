import AppLayout from "@/layouts/Applayout";
import { TriangleAlert, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface WorkloadHealth {
  severity: "mild" | "bad";
  warningMessage: string;
  suggestions: string[];
}

const projectHealth: WorkloadHealth = {
  severity: "bad", // switch to "bad" to preview the severe/red state
  warningMessage: "2 member(s) underutilized. Imbalance ratio: 1.27",
  suggestions: ["Task Redistribution Recommended"],
};

const workloadStats = [
  {
    title: "TOTAL WORKLOAD",
    value: "40 PTS",
    description: "ACROSS 5 MEMBERS",
    valueColor: "text-black",
  },
  {
    title: "AVG. PER MEMBER",
    value: "2.5 PTS",
    description: "TARGET CAPACITY",
    valueColor: "text-black",
  },
  {
    title: "OVERLOADED",
    value: "1",
    description: "MEMBERS OVER LIMIT",
    valueColor: "text-red-500",
  },
  {
    title: "UNDERUTILIZED",
    value: "1",
    description: "MEMBERS BELOW 20%",
    valueColor: "text-black",
  },
];

const memberWorkload = [
  { name: "Harry Guzman", pts: 17, max: 20 },
  { name: "Rommel Magsino", pts: 19, max: 20 },
  { name: "Dylan Mangaoang", pts: 12, max: 20 },
  { name: "John Wesley Montes", pts: 16, max: 20 },
  { name: "Clarisa Paule", pts: 15, max: 20 },
  { name: "Andrea Paule", pts: 20, max: 20 },
];

const complexityData = [
  { name: "High Complexity", value: 20, count: 4, color: "#ef4444" },
  { name: "Medium Complexity", value: 55, count: 11, color: "#eab308" },
  { name: "Low Complexity", value: 25, count: 5, color: "#22c55e" },
];

const redistributionItems = [
  {
    priority: "HIGH",
    type: "Transfer",
    description: `Transfer "User Auth Scaffolding" from`,
    from: "John Wesley Montes",
    to: "Dylan Mangaoang",
    impact: "Balances workload by 15%",
    priorityColor: "bg-red-500 text-white",
  },
  {
    priority: "MEDIUM",
    type: "Transfer",
    description: `Transfer "API Integration" from`,
    from: "Rommel Magsino",
    to: "Dylan Mangaoang",
    impact: "Balances workload by 10%",
    priorityColor: "bg-yellow-400 text-black",
  },
  {
    priority: "LOW",
    type: "Reassign",
    description: `Reassign "Documentation" from`,
    from: "Andrea Paule",
    to: "Harry Guzman",
    impact: "Balances workload by 5%",
    priorityColor: "bg-green-500 text-white",
  },
];

export default function Workload() {
  const isBad = projectHealth.severity === "bad";

  return (
    <AppLayout
      breadcrumbs={[{ label: "Workload", href: "/workload" }]}
    >
      <h1 className="text-(--text-h) text-2xl font-bold dark:text-card-foreground mb-2">
        Track and optimize task distribution across team members
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Warning Banner */}
        <Card
          className={`bg-card border-4 p-4 rounded-lg lg:col-span-2 flex items-start justify-between ${
            isBad
              ? "border-red-500 dark:border-red-500"
              : "border-yellow-500 dark:border-yellow-500"
          }`}
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <TriangleAlert
                className={`h-5 w-5 ${isBad ? "text-red-500" : "text-yellow-500"}`}
              />
              <h2
                className={`font-semibold ${
                  isBad
                    ? "text-red-700 dark:text-red-500"
                    : "text-gray-900 dark:text-yellow-500"
                }`}
              >
                {isBad
                  ? "Severe Workload Imbalance Detected"
                  : "Mild Workload Imbalance Detected"}
              </h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-card-foreground">
              {projectHealth.warningMessage}
            </p>
            <p className="text-sm text-gray-600 dark:text-card-foreground">
              Suggestions
            </p>
            <div className="flex gap-2 flex-wrap">
              {projectHealth.suggestions.map((s) => (
                <span
                  key={s}
                  className={`rounded-full border px-3 py-1 text-xs dark:text-card-foreground ${
                    isBad
                      ? "border-red-300 text-red-600"
                      : "border-gray-300 text-gray-600"
                  }`}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:col-span-2">
          {workloadStats.map((stat, index) => (
            <Card key={index} className="shadow-sm border rounded-xl">
              <CardContent className="p-5 flex flex-col gap-3">
                <p className="text-xs tracking-wide text-card-foreground font-medium">
                  {stat.title}
                </p>
                <h2 className={`text-3xl text-card-foreground font-bold ${stat.valueColor}`}>
                  {stat.value}
                </h2>
                <p className="text-xs text-card-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Member Workload */}
        <Card className="shadow-sm border rounded-xl">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Member Workload</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {memberWorkload.map((member) => {
              const pct = (member.pts / member.max) * 100;
              const isOver = member.pts >= member.max;
              return (
                <div key={member.name} className="flex flex-col gap-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-card-foreground font-medium">{member.name}</span>
                    <span className={`text-xs font-semibold ${isOver ? "text-red-500" : "text-card-foreground"}`}>
                      {member.pts}/{member.max} pts
                    </span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isOver ? "bg-red-500" : "bg-yellow-400"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Task Complexity Distribution */}
        <Card className="shadow-sm border rounded-xl">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Task Complexity Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={complexityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {complexityData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`${value}%`, ""]}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Legend
                  formatter={(value) => <span className="text-xs text-card-foreground">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-3 gap-2 mt-2 text-center">
              {complexityData.map((d) => (
                <div key={d.name} className="flex flex-col items-center gap-0.5">
                  <span className="text-2xl font-bold" style={{ color: d.color }}>
                    {d.count}
                  </span>
                  <span className="text-xs text-card-foreground">
                    {d.name.replace(" Complexity", "")}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Redistribution Recommendations */}
        <Card className="shadow-sm border rounded-xl lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Redistribution Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {redistributionItems.map((item, i) => (
              <div key={i} className="border rounded-lg p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${item.priorityColor}`}>
                    {item.priority}
                  </span>
                  <span className="text-xs border border-gray-300 rounded px-2 py-0.5 text-card-foreground">
                    {item.type}
                  </span>
                </div>
                <p className="text-sm text-card-foreground">
                  {item.description}{" "}
                  <span className="font-semibold">{item.from}</span>{" "}
                  <ArrowRight className="inline h-3 w-3 text-gray-400" />{" "}
                  <span className="font-semibold">{item.to}</span>
                </p>
                <p className="text-xs text-gray-400">{item.impact}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}