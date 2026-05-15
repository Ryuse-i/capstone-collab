import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const themes = [
  {
    id: "light",
    label: "Light",
    preview: (
      <div className="w-full h-20 bg-white border border-gray-200 rounded-md p-2 flex flex-col gap-1.5">
        <div className="h-2 w-3/4 bg-gray-200 rounded" />
        <div className="h-2 w-1/2 bg-gray-200 rounded" />
        <div className="h-2 w-2/3 bg-gray-200 rounded" />
      </div>
    ),
  },
  {
    id: "dark",
    label: "Dark",
    preview: (
      <div className="w-full h-20 bg-[#1e1e2e] border border-gray-700 rounded-md p-2 flex flex-col gap-1.5">
        <div className="h-2 w-3/4 bg-[#4a4a8a] rounded" />
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-[#6b6bcc]" />
          <div className="h-2 w-1/2 bg-[#4a4a8a] rounded" />
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-[#6b6bcc]" />
          <div className="h-2 w-2/3 bg-[#4a4a8a] rounded" />
        </div>
      </div>
    ),
  },
];

export default function AppearanceSettings() {
  const [selectedTheme, setSelectedTheme] = useState("light");

  return (
    <div className="flex flex-col gap-6 p-6 bg-card border border-border rounded-lg">
      
      {/* Theme */}
      <div className="flex flex-col gap-3">
        <div>
          <h3 className="font-medium text-base">Theme</h3>
          <p className="text-sm text-muted-foreground">
            Select the theme for the dashboard.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 max-w-sm">
          {themes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => setSelectedTheme(theme.id)}
              className={cn(
                "flex flex-col gap-2 rounded-lg border-2 p-2 transition-all",
                selectedTheme === theme.id
                  ? "border-primary"
                  : "border-border hover:border-muted-foreground"
              )}
            >
              {theme.preview}
              <span className="text-sm font-medium text-center">
                {theme.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <Button className="w-fit">Update Preference</Button>
    </div>
  );
}