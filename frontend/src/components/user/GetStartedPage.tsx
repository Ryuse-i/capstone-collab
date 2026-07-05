import React, { useState } from "react";
import {
  CheckCircle2,
  FolderPlus,
  Play,
  HelpCircle,
  Key,
  Activity,
  FileText,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import CreateProjectDialog from "@/components/user/CreateProjectDialog";
import { useCurrentUser } from "@/hooks/useAuth";

export default function GetStarted() {
  const { data: user, isLoading } = useCurrentUser();
  const firstName = user?.first_name || "there";

  const [completedSteps] = useState<number[]>([]);

  const steps = [
    { id: 1, title: "Create a project" },
    { id: 2, title: "Invite team members" },
    { id: 3, title: "Set up your first board" },
  ];

  const completedCount = completedSteps.length;
  const progressPercentage = (completedCount / steps.length) * 100;

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-(--text-h) m-0 sm:text-4xl dark:text-foreground">
            Get Started
          </h1>
          <p className="dark:text-foreground mt-1 text-base">
            Hi {isLoading ? "..." : firstName}, Welcome to your workspace. Let's
            get your team set up for success.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-[#701D0B]/10 text-[#701D0B] border border-[#701D0B]/20">
          <span className="w-1.5 h-1.5 rounded-full bg-[#701D0B] animate-pulse"></span>
          Setup Mode
        </span>
      </div>

      {/* Top Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Setup Checklist */}
        <div className="lg:col-span-2 relative overflow-hidden bg-card rounded-lg border border-border p-6 shadow-(--shadow) flex flex-col justify-between">
          <div className="absolute right-0 top-0 w-32 h-32 bg-[#E4C208]/10 rounded-full blur-2xl -mr-5 -mt-5   pointer-events-none" />
          <div className="absolute right-12 bottom-0 w-24 h-24 bg-[#701D0B]/5 rounded-full blur-xl pointer-events-none" />

          <div>
            <h2 className="text-xl font-semibold text-(--text-h) flex items-center gap-2 dark:text-card-foreground">
              Setup Checklist
            </h2>

            <div className="mt-4 flex items-center gap-4">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-500 ease-in-out"
                  style={{
                    width: `${progressPercentage}%`,
                    backgroundColor: "#701D0B",
                  }}
                />
              </div>
              <span className="text-sm font-mono text-(--text) whitespace-nowrap dark:text-card-foreground">
                {completedCount} of {steps.length}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              {steps.map((step) => {
                const isCompleted = completedSteps.includes(step.id);
                return (
                  <div
                    key={step.id}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-(--muted)/50 transition-colors "
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-[#701D0B] shrink-0 " />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-(--text)/35 flex items-center justify-center font-mono text-xs text-(--text) shrink-0 dark:text-card-foreground">
                        {step.id}
                      </div>
                    )}
                    <span
                      className={`text-sm ${isCompleted ? "text-(--text) line-through" : "text-(--text-h) font-medium dark:text-card-foreground"}`}
                    >
                      {step.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Watch Demo Video Card */}
        <div className="bg-card rounded-lg border border-border p-6 shadow-(--shadow) flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-muted rounded-full opacity-40 pointer-events-none" />

          <div>
            <h3 className="text-lg font-semibold text-(--text-h) mb-2 dark:text-card-foreground">
              Watch our Demo Video
            </h3>
            <p className="text-sm text-(--text) leading-relaxed dark:text-card-foreground">
              Watch this 2-minute overview to learn how to manage a simple
              project, and assign tasks effectively.
            </p>
          </div>

          <button
            className="mt-6 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium border border-border hover:bg-muted text-(--text-h) transition-all group dark:text-card-foreground"
            style={{ "--ring-color": "#701D0B" } as React.CSSProperties}
          >
            <div className="w-6 h-6 rounded-full bg-[#701D0B]/10 flex items-center justify-center text-[#701D0B] group-hover:bg-[#701D0B] group-hover:text-white transition-colors">
              <Play className="w-3 h-3 fill-current ml-0.5" />
            </div>
            Watch video
          </button>
        </div>
      </div>

      {/* Bottom Layout Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
        {/* Quick Actions */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-semibold text-(--text-h) tracking-tight dark:text-foreground">
            Quick Actions
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-lg p-5 shadow-(--shadow) flex flex-col justify-between items-start hover:border-[#701D0B]/40 transition-colors group">
              <div className="w-10 h-10 rounded-lg bg-[#701D0B]/10 text-[#701D0B] flex items-center justify-center mb-4">
                <FolderPlus className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-(--text-h) mb-1 dark:text-card-foreground">
                  Create a project
                </h4>
                <p className="text-sm text-(--text) mb-5 dark:text-card-foreground">
                  Set up a fresh workspace, define your roadmap, and choose
                  layout views.
                </p>
              </div>
              <div>
                <CreateProjectDialog />
              </div>
            </div>
          </div>
        </div>

        {/* Resources & Support Column */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-(--text-h) tracking-tight dark:text-foreground">
            Resources & Support
          </h3>
          <div className="bg-card border border-border rounded-lg p-5 shadow-(--shadow)">
            <p className="text-sm text-(--text) mb-4 leading-relaxed dark:text-card-foreground">
              Find useful documentation, key configurations, system uptimes, and
              direct developer guides below.
            </p>

            <nav className="space-y-3.5">
              {[
                { label: "Help Center", icon: HelpCircle },
                { label: "View API Integration Keys", icon: Key },
                {
                  label: "Platform Status Page",
                  icon: Activity,
                  external: true,
                },
                {
                  label: "Browse Developer Docs",
                  icon: FileText,
                  external: true,
                },
              ].map((link, idx) => (
                <a
                  key={idx}
                  href="#"
                  className="flex items-center justify-between text-sm font-medium transition-colors hover:text-[#701D0B] group text-(--text-h) dark:text-card-foreground"
                >
                  <span className="flex items-center gap-2.5">
                    <link.icon className="w-4 h-4 text-(--text) group-hover:text-[#701D0B] transition-colors dark:text-card-foreground" />
                    {link.label}
                  </span>
                  {link.external ? (
                    <ExternalLink className="w-3.5 h-3.5 text-(--text) opacity-60 dark:text-card-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-(--text) opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all dark:text-card-foreground" />
                  )}
                </a>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
