import { useState } from "react";
import AppLayout from "@/layouts/Applayout";
import { Button } from "@/components/ui/button";
import { User, Palette } from "lucide-react";
import AccountSettings from "@/components/settings/AccountSettings";
import AppearanceSettings from "@/components/settings/AppearanceSettings";

const tabs = [
  { id: "account", label: "Account", icon: <User className="h-4 w-4" /> },
  { id: "appearance", label: "Appearance", icon: <Palette className="h-4 w-4" /> },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState("account");

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

      {/* Tab content */}
      {activeTab === "account" && <AccountSettings />}
      {activeTab === "appearance" && <AppearanceSettings />}

    </AppLayout>
  );
}