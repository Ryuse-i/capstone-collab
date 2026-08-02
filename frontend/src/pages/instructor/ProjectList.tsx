import { useState } from "react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { Plus, MoreHorizontal } from "lucide-react";
import AppLayout from "@/layouts/Applayout";
import { Card } from "@/components/ui/card";

const FILTERS = ["All", "Internal", "Collaboration", "Archived"];

type Performance = "Good" | "Medium" | "Low";

interface Owner {
  name: string;
  role: string;
}

interface Project {
  title: string;
  tag?: string;
  members?: string[];
  extraMembers?: number;
  trend: number[];
  trendPct: string;
  trendUp: boolean;
  score: number;
  stage: string;
  performance: Performance;
  owner?: Owner;
}

const projects: Project[] = [
  {
    title: "Student Records Migration Module",
    tag: "Backend",
    members: ["JD", "MR", "AC"],
    extraMembers: 5,
    trend: [4, 6, 5, 8, 7, 9, 10, 9, 11],
    trendPct: "+56%",
    trendUp: true,
    score: 85,
    stage: "Founding",
    performance: "Good",
  },
  {
    title: "Faculty Advising Portal",
    tag: "Design",
    members: ["LT", "NB"],
    trend: [3, 4, 4, 5, 6, 5, 7, 8, 7],
    trendPct: "+48%",
    trendUp: true,
    score: 62,
    stage: "Market Fit",
    performance: "Good",
  },
  {
    title: "Capstone Defense Scheduler",
    tag: "Frontend",
    members: ["KP", "LT"],
    extraMembers: 2,
    trend: [8, 7, 6, 5, 6, 5, 4, 5, 4],
    trendPct: "+52%",
    trendUp: true,
    score: 45,
    stage: "Series D+",
    performance: "Medium",
  },
  {
    title: "Team Workload Analytics",
    tag: "Data",
    members: ["RS", "NB", "JD"],
    extraMembers: 3,
    trend: [9, 8, 6, 5, 3, 4, 2, 3, 2],
    trendPct: "-36%",
    trendUp: false,
    score: 22,
    stage: "Seed",
    performance: "Low",
  },
  {
    title: "Mobile Attendance Tracker",
    tag: "Mobile",
    members: ["AC", "MR"],
    trend: [5, 6, 5, 7, 6, 8, 7, 9, 8],
    trendPct: "+56%",
    trendUp: true,
    score: 72,
    stage: "Founding",
    performance: "Good",
  },
  {
    title: "Alumni Engagement Dashboard",
    tag: "Frontend",
    members: ["JD", "KP", "RS"],
    extraMembers: 1,
    trend: [4, 5, 6, 7, 8, 9, 10, 11, 12],
    trendPct: "+66%",
    trendUp: true,
    score: 92,
    stage: "Series A",
    performance: "Good",
  },
];

const stageColors: Record<string, string> = {
  Founding: "bg-[#C9A84C]",
  "Market Fit": "bg-[#7A0C2E]",
  "Series D+": "bg-[#C9A84C]",
  Seed: "bg-neutral-300",
  "Series A": "bg-[#7A0C2E]",
};

const performanceColors: Record<string, string> = {
  Good: "text-emerald-600",
  Medium: "text-[#C9A84C]",
  Low: "text-rose-500",
};

function Avatar({ initials, idx }: { initials: string; idx: number }) {
  const palette = ["#7A0C2E", "#C9A84C", "#3F3350", "#8C6A4B"];
  return (
    <div
      className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold text-white ring-2 ring-white"
      style={{ backgroundColor: palette[idx % palette.length] }}
    >
      {initials}
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? "#1e8a5f" : score >= 40 ? "#C9A84C" : "#e0546a";

  return (
    <div className="relative h-11 w-11 shrink-0">
      <svg viewBox="0 0 44 44" className="h-11 w-11 -rotate-90">
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke="#f0ece4"
          strokeWidth="4"
        />
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-[11px] font-bold"
        style={{ color }}
      >
        {score}
      </span>
    </div>
  );
}

function ProjectRow({ p }: { p: Project }) {
  return (
    <div className="grid grid-cols-1 gap-0 border-b border-neutral-200 bg-white py-4 text-sm last:border-b-0 sm:grid-cols-[2.6fr_1.2fr_1fr_0.95fr_0.9fr_0.9fr_0.3fr] sm:gap-0">
      {/* Title */}
      <div className="flex items-center gap-3 px-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FBF3E7]">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M3 2h7l3 3v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z"
              stroke="#C9A84C"
              strokeWidth="1.3"
            />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-[#231A2E]">{p.title}</p>
          {p.owner ? (
            <div className="mt-1 flex items-center gap-1.5 text-xs text-neutral-400">
              <Avatar initials="MS" idx={0} />
              <span>
                {p.owner.name} <span className="text-neutral-300">·</span>{" "}
                {p.owner.role}
              </span>
            </div>
          ) : (
            <span className="mt-1 inline-block rounded-md bg-[#F3EFE6] px-2 py-0.5 text-[11px] font-medium text-[#7A0C2E]">
              {p.tag}
            </span>
          )}
        </div>
      </div>

      {/* Members */}
      <div className="flex items-center px-3">
        <div className="flex -space-x-2">
          {p.members?.map((m, i) => (
            <Avatar key={m} initials={m} idx={i} />
          ))}
          {p.extraMembers && (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-[10px] font-semibold text-neutral-500 ring-2 ring-white">
              +{p.extraMembers}
            </div>
          )}
        </div>
      </div>

      {/* Trend */}
      <div className="flex flex-col gap-1 px-3">
        <div className="h-9 w-24">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={p.trend.map((v, i) => ({ i, v }))}>
              <Line
                type="monotone"
                dataKey="v"
                stroke={p.trendUp ? "#3F3350" : "#e0546a"}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <span className="text-xs text-neutral-400">
          <span className={p.trendUp ? "text-emerald-600" : "text-rose-500"}>
            {p.trendPct} {p.trendUp ? "↗" : "↘"}
          </span>
        </span>
      </div>

      {/* Score */}
      <div className="flex items-center gap-3 px-3">
        <ScoreRing score={p.score} />
        <div className="text-xs text-neutral-400">
          Score
          <br />
          out of 100
        </div>
      </div>

      {/* Stage */}
      <div className="px-3">
        <p className="text-sm font-semibold text-[#231A2E]">{p.stage}</p>
        <div className="mt-1 flex gap-0.5">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`h-1 w-4 rounded-full ${i === 0 ? stageColors[p.stage] : "bg-neutral-100"}`}
            />
          ))}
        </div>
      </div>

      {/* Performance */}
      <div className="flex items-center px-3">
        <p
          className={`text-sm font-semibold ${performanceColors[p.performance]}`}
        >
          {p.performance}
        </p>
      </div>

      <div className="flex items-center justify-end px-3">
        <button className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100">
          <MoreHorizontal size={18} />
        </button>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const [active, setActive] = useState("Internal");

  return (
    <AppLayout breadcrumbs={[{ label: "Projects", href: "/project-list" }]}>
      <div className="min-h-screen w-full px-4">
        {/* Header */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#231A2E]">Projects</h1>
            <div className="mt-3 flex items-center gap-1 text-sm">
              <span className="mr-2 text-neutral-400">Filter By:</span>
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setActive(f)}
                  className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
                    active === f
                      ? "bg-[#231A2E] text-white"
                      : "text-neutral-400 hover:text-neutral-600"
                  }`}
                >
                  {f}
                  {f === "Internal" && (
                    <span className="ml-1 opacity-70">(102)</span>
                  )}
                  {f === "Collaboration" && (
                    <span className="ml-1 opacity-70">(50)</span>
                  )}
                  {f === "Archived" && (
                    <span className="ml-1 opacity-70">(8)</span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <button className="flex items-center gap-2 rounded-xl bg-[#7A0C2E] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#630A25]">
            <Plus size={16} />
            Add Project
          </button>
        </div>

        {/* List */}
        <Card className="overflow-hidden border border-neutral-200 shadow-sm">
          <div className="hidden grid-cols-[2.8fr_1.2fr_1fr_0.95fr_0.9fr_0.9fr_0.3fr] gap-0 border-b border-neutral-200 bg-slate-50 py-4 text-xs uppercase tracking-[0.08em] text-neutral-500 sm:grid">
            <span className="px-3">Project</span>
            <span className="px-3">Members</span>
            <span className="px-3">Trend</span>
            <span className="px-3">Score</span>
            <span className="px-3">Stage</span>
            <span className="px-3">Performance</span>
            <span className="px-3 text-right">Action</span>
          </div>
          {projects.map((p) => (
            <ProjectRow key={p.title} p={p} />
          ))}
        </Card>
      </div>
    </AppLayout>
  );
}
