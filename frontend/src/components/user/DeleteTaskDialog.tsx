import { useState, type ReactElement } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2Icon } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { useDeleteTask, taskKeys } from "@/hooks/useTask";
import type { TaskResponse } from "@/types/task";

export interface DeleteTaskDialogProps {
  task: TaskResponse;
  projectId: string;
  onDeleted?: () => void;
  trigger?: ReactElement;
}

export default function DeleteTaskDialog({
  task,
  projectId,
  trigger,
  onDeleted,
}: DeleteTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteTaskMutation = useDeleteTask();
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    setError(null);
    try {
      await deleteTaskMutation.mutateAsync(task.id);

      // useDeleteTask invalidates taskKeys.list() and removes
      // taskKeys.detail(id), but the project-scoped list Task.tsx reads
      // from (useGetAllProjectTask) isn't covered by that.
      queryClient.invalidateQueries({
        queryKey: taskKeys.listProject(projectId),
      });

      onDeleted?.();
      setOpen(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while deleting this task.",
      );
    }
  };

  const isDeleting = deleteTaskMutation.isPending;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {trigger ?? (
          <Button variant="destructive" size="sm">
            Delete
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
            <Trash2Icon />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete "{task.name}"?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove the task and its complexity score. This
            action can't be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel variant="outline" disabled={isDeleting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={(e) => {
              // Prevent the default auto-close so we can control it
              // ourselves after the mutation resolves (and keep the
              // dialog open with an error message if it fails).
              e.preventDefault();
              handleDelete();
            }}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
