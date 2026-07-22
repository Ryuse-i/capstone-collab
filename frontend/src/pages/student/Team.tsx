import AppLayout from "@/layouts/Applayout";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Clock, Circle, TrendingUp, AlertCircle } from "lucide-react";

const members = [
  {
    initials: "JW",
    name: "John Wesley Montes",
    role: "Project Leader",
    status: "Active",
    statusColor: "bg-green-500",
    badge: "OVERLOADED",
    badgeColor: "border-red-400 text-red-500 bg-white dark:bg-card-foreground/5",
    currentTask: "User Authentication Module",
    completed: 4,
    inProgress: 1,
    total: 5,
    workload: 45,
    onTimeRate: 85,
    avgCompletion: "4.5d",
    strengths: ["Consistent Delivery", "High quality output"],
    improvements: ["Task estimation accuracy"],
  },
  {
    initials: "DM",
    name: "Dylan Mangaoang",
    role: "Frontend Developer",
    status: "Idle",
    statusColor: "bg-green-500",
    badge: null,
    badgeColor: "",
    currentTask: "Item Input Forms",
    completed: 2,
    inProgress: 1,
    total: 3,
    workload: 20,
    onTimeRate: 90,
    avgCompletion: "5d",
    strengths: ["Fast Completion", "Meets Deadline"],
    improvements: ["Late Starts"],
  },
  {
    initials: "HG",
    name: "Harry Guzman",
    role: "UI Designer",
    status: "Active",
    statusColor: "bg-green-500",
    badge: null,
    badgeColor: "",
    currentTask: "Dashboard Redesign",
    completed: 3,
    inProgress: 2,
    total: 5,
    workload: 35,
    onTimeRate: 78,
    avgCompletion: "3.8d",
    strengths: ["Creative Output", "Fast Prototyping"],
    improvements: ["Documentation"],
  },
  {
    initials: "RM",
    name: "Rommel Magsino",
    role: "Lead Researcher",
    status: "Active",
    statusColor: "bg-green-500",
    badge: "UNDERUTILIZED",
    badgeColor: "border-yellow-400 text-yellow-600 bg-yellow-50",
    currentTask: "Market Analysis Report",
    completed: 1,
    inProgress: 1,
    total: 2,
    workload: 15,
    onTimeRate: 95,
    avgCompletion: "6d",
    strengths: ["Thorough Research", "On-Time Delivery"],
    improvements: ["Task Ownership"],
  },
];

function MemberCard({ member }: { member: (typeof members)[0] }) {
  return (
    <Card className="shadow-sm border rounded-xl">
      <CardContent className="p-5 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-2 border-gray-300 flex items-center justify-center bg-primary dark:bg-gray-800 dark:border-gray-600">
                <span className="text-sm font-bold text-primary-foreground dark:text-foreground">
                  {member.initials}
                </span>
              </div>
              <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${member.statusColor}`} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-card-foreground text-sm">{member.name}</span>
              <span className="text-xs text-card-foreground dark:text-gray-400">{member.role}</span>
              <span className="text-xs border border-gray-600 text-green-600 rounded-full px-2 py-0.5 w-fit">
                {member.status}
              </span>
            </div>
          </div>
          {member.badge && (
            <span className={`text-xs font-bold border rounded px-2 py-1 ${member.badgeColor}`}>
              {member.badge}
            </span>
          )}
        </div>

        {/* Currently Working On */}
        <div className="bg-gray-50 rounded-lg px-4 py-3 dark:bg-card-foreground/5">
          <p className="text-xs text-gray-400 dark:text-card-foreground">Currently working on</p>
          <p className="text-sm font-semibold text-gray-800 dark:text-card-foreground mt-0.5">{member.currentTask}</p>
        </div>

        {/* Task Stats */}
        <div className="grid grid-cols-3 gap-2 border-b pb-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1 text-green-500">
              <CheckCircle className="w-3.5 h-3.5" />
              <span className="text-xs text-gray-400">Completed</span>
            </div>
            <span className="text-2xl font-bold text-gray-800 dark:text-card-foreground">{member.completed}</span>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1 text-yellow-500">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-xs text-gray-400">In Progress</span>
            </div>
            <span className="text-2xl font-bold text-gray-800 dark:text-card-foreground">{member.inProgress}</span>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1 text-gray-400">
              <Circle className="w-3.5 h-3.5" />
              <span className="text-xs text-gray-400">Total</span>
            </div>
            <span className="text-2xl font-bold text-gray-800 dark:text-card-foreground">{member.total}</span>
          </div>
        </div>

        {/* Progress Bars */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs text-gray-500 dark:text-card-foreground">
              <span>Workload</span>
              <span>{member.workload}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${member.workload}%` }} />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs text-gray-500 dark:text-card-foreground">
              <span>On-Time Rate</span>
              <span>{member.onTimeRate}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${member.onTimeRate}%` }} />
            </div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-card-foreground">
            <span>Avg. Completion</span>
            <span className="font-medium text-gray-700 dark:text-card-foreground">{member.avgCompletion}</span>
          </div>
        </div>

        {/* Strengths */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-card-foreground font-medium">
            <TrendingUp className="w-3.5 h-3.5 text-green-500" />
            Strengths
          </div>
          <div className="flex flex-wrap gap-1.5">
            {member.strengths.map((s) => (
              <span key={s} className="text-xs border border-green-400 text-green-700 rounded-full px-2 py-0.5">
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* Areas for Improvement */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-card-foreground font-medium">
            <AlertCircle className="w-3.5 h-3.5 text-yellow-500" />
            Areas for improvement
          </div>
          <div className="flex flex-wrap gap-1.5">
            {member.improvements.map((s) => (
              <span key={s} className="text-xs border border-yellow-400 text-yellow-700 rounded-full px-2 py-0.5">
                {s}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Team() {
  return (
    <AppLayout breadcrumbs={[{ label: "Team Members", href: "/Team" }]}>
      <h1 className="text-2xl font-bold text-foreground mb-2">Manage members and monitor activities</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {members.map((member) => (
          <MemberCard key={member.name} member={member} />
        ))}
      </div>
    </AppLayout>
  );
}