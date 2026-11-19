import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useCurrentUser } from "@/hooks/useAuth";
import { useGetCurrentMember } from "@/hooks/useProjectMember";
import {
  useDeleteProject,
  useGetOneProject,
  useUpdateProject,
} from "@/hooks/useProject";

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
  const deleteProject = useDeleteProject();
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);

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
  const isProjectLeader = member?.project_role === "leader";

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

      {isProjectLeader && (
        <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-foreground">Danger zone</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Permanently delete this project and its associated data.
              </p>
            </div>
            <AlertDialog
              open={deleteOpen}
              onOpenChange={(open) => {
                if (!deleteProject.isPending) setDeleteOpen(open);
              }}
            >
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive">
                  <Trash2 className="size-4" aria-hidden="true" />
                  Delete project
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent size="sm">
                <AlertDialogHeader>
                  <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
                    <Trash2 />
                  </AlertDialogMedia>
                  <AlertDialogTitle>
                    Delete &quot;{project.name}&quot;?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently deletes the project, its tasks, members,
                    and related data. This action can&apos;t be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel
                    variant="outline"
                    disabled={deleteProject.isPending}
                  >
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    disabled={deleteProject.isPending}
                    onClick={(event) => {
                      event.preventDefault();
                      deleteProject.mutate(projectId, {
                        onSuccess: () => {
                          toast.success("Project deleted");
                          setDeleteOpen(false);
                          navigate("/dashboard", { replace: true });
                        },
                        onError: () => {
                          toast.error(
                            "Could not delete the project. Please try again.",
                          );
                        },
                      });
                    }}
                  >
                    {deleteProject.isPending ? "Deleting..." : "Delete project"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </section>
      )}
    </form>
  );
}