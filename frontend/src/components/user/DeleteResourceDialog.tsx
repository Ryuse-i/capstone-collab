import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ProjectResource } from "@/types/resource";

interface DeleteResourceDialogProps {
  resource: ProjectResource | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (resourceId: string) => void;
  isDeleting?: boolean;
}

export default function DeleteResourceDialog({
  resource,
  open,
  onOpenChange,
  onConfirm,
  isDeleting = false,
}: DeleteResourceDialogProps) {
  if (!resource) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !isDeleting && onOpenChange(next)}>
      <DialogContent className="max-w-md dark:bg-background">
        <DialogHeader>
          <DialogTitle>Delete resource?</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{resource.title}</span> will be
            permanently removed from this project
            {resource.file ? ", along with its attached file" : ""}. This can't be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => onConfirm(resource.id)}
            disabled={isDeleting}
          >
            <Trash2 className="size-3.5" />
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}