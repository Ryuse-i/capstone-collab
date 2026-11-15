import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/useAuth";
import { useGetCurrentMember } from "@/hooks/useProjectMember";
import { useGetOneProject, useUpdateProject } from "@/hooks/useProject"; // adjust path

type FormState = {
  name: string;
  description: string;
};

export default function ProjectSettings() {
  const { data: user } = useCurrentUser();
  const { data: member } = useGetCurrentMember(user?.id ?? "");
  const projectId = member?.project_id ?? "";

  const { data: project, isLoading } = useGetOneProject(projectId);
  const updateProject = useUpdateProject();

  const [form, setForm] = useState<FormState>({
    name: "",
    description: "",
  });

  const fromProject = (p: NonNullable<typeof project>): FormState => ({
    name: p.name,
    description: p.description ?? "",
  });

  useEffect(() => {
    if (project) setForm(fromProject(project));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project]);

  if (isLoading || !project) return <Skeleton className="h-64 w-full" />;

  const isDirty =
    form.name !== project.name ||
    form.description !== (project.description ?? "") 

  const canSave =
    isDirty && form.name.trim().length > 0 && !updateProject.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProject.mutate(
      {
        id: projectId,
        project: {
          name: form.name.trim(),
          description: form.description,
        },
      },
      {
        onSuccess: () => toast.success("Project settings saved"),
        onError: () => toast.error("Could not save project settings"),
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Project name</Label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          rows={4}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={!canSave}>
          {updateProject.isPending ? "Saving…" : "Save changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!isDirty}
          onClick={() => setForm(fromProject(project))}
        >
          Reset
        </Button>
      </div>
    </form>
  );
}