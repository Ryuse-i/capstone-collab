import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ProjectSettings() {
  const [projectName, setProjectName] = useState("Capstone Collaboration");
  const [projectDescription, setProjectDescription] = useState(
    "Manage tasks, members, and submissions for this project.",
  );

  return (
    <div className="flex flex-col gap-6 rounded-lg border border-border bg-card p-6">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="projectName">Project Name</Label>
        <Input
          id="projectName"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="Enter project name"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="projectDescription">Project Description</Label>
        <textarea
          id="projectDescription"
          value={projectDescription}
          onChange={(e) => setProjectDescription(e.target.value)}
          rows={4}
          className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          placeholder="Describe your project"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button>Save Changes</Button>
        <Button variant="outline">Cancel</Button>
      </div>
    </div>
  );
}
