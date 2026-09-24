import { useEffect, useState } from "react";
import AppLayout from "@/layouts/Applayout";
import { Button } from "@/components/ui/button";
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

export default function Settings() {
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const { data: user } = useCurrentUser();
  const { data: currentMember } = useGetCurrentMember(user?.id ?? "");
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
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold dark:text-foreground">Settings</h1>
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
    </AppLayout>
  );
}
