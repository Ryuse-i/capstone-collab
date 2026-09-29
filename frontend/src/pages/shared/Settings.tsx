import { useEffect, useState } from "react";
import AppLayout from "@/layouts/Applayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Palette, FolderKanban } from "lucide-react";
import AccountSettings from "@/components/settings/AccountSettings";
import AppearanceSettings from "@/components/settings/AppearanceSettings";
import ProjectSettings from "@/components/settings/ProjectSettings";
import { useCurrentUser } from "@/hooks/useAuth";
import { useGetCurrentMember } from "@/hooks/useProjectMember";

const tabs = [
  {
    id: "project",
    label: "Project Settings",
    icon: <FolderKanban className="h-4 w-4" />,
  },
  { id: "account", label: "Account", icon: <User className="h-4 w-4" /> },
  {
    id: "appearance",
    label: "Appearance",
    icon: <Palette className="h-4 w-4" />,
  },
];

const STORAGE_KEY = "settings-active-tab";

function getInitialTab() {
  if (typeof window === "undefined") return "account";

  const savedTab = window.localStorage.getItem(STORAGE_KEY);
  return tabs.some((tab) => tab.id === savedTab) ? savedTab! : "account";
}

// ---------------------------------------------------------------------------
// Settings Skeleton
// ---------------------------------------------------------------------------

function SettingsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 w-36 rounded-md" />
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>

      {/* ── Settings Content ───────────────────────────────────────── */}
      <div className="flex flex-col gap-6">
        {/* Section heading */}
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>

        {/* Settings card */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex flex-col gap-6">
            {/* Setting row */}
            <div className="flex items-center justify-between gap-6">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-64 max-w-[50vw]" />
              </div>

              <Skeleton className="h-9 w-28 shrink-0 rounded-md" />
            </div>

            <div className="h-px w-full bg-border" />

            {/* Setting row */}
            <div className="flex items-center justify-between gap-6">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-72 max-w-[50vw]" />
              </div>

              <Skeleton className="h-9 w-32 shrink-0 rounded-md" />
            </div>

            <div className="h-px w-full bg-border" />

            {/* Setting row */}
            <div className="flex items-center justify-between gap-6">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-56 max-w-[50vw]" />
              </div>

              <Skeleton className="h-9 w-24 shrink-0 rounded-md" />
            </div>
          </div>
        </div>

        {/* Additional settings block */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-full max-w-xl" />
            <Skeleton className="h-10 w-full max-w-md rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState(getInitialTab);

  const { data: user, isLoading: userLoading } = useCurrentUser();

  const {
    data: currentMember,
    isLoading: memberLoading,
  } = useGetCurrentMember(user?.id ?? "");

  const isLoading = userLoading || memberLoading;

  const isProjectLeader =
    currentMember?.project_role.toLowerCase() === "leader";

  const visibleTabs = tabs.filter(
    (tab) => tab.id !== "project" || isProjectLeader,
  );

  useEffect(() => {
    if (!isProjectLeader && activeTab === "project") {
      setActiveTab("account");
    }
  }, [activeTab, isProjectLeader]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, activeTab);
  }, [activeTab]);

  return (
    <AppLayout breadcrumbs={[{ label: "Settings", href: "/settings" }]}>
      {isLoading ? (
        <SettingsSkeleton />
      ) : (
        <>
          {/* Header */}
          <div>
            <h1 className="text-xl font-semibold dark:text-foreground">
              Settings
            </h1>

            <p className="text-sm text-muted-foreground">
              Manage your account settings and set e-mail preferences.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            {visibleTabs.map((tab) => (
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

          {/* Tab content */}
          {activeTab === "project" && isProjectLeader && <ProjectSettings />}

          {activeTab === "account" && <AccountSettings />}

          {activeTab === "appearance" && <AppearanceSettings />}
        </>
      )}
    </AppLayout>
  );
}