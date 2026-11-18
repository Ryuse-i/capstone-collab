import { useId, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAcceptInviteLink } from "@/hooks/useInviteLink";

interface JoinProjectDialogProps {
  triggerLabel?: string;
  iconOnly?: boolean;
  triggerTourTarget?: string;
}

function getInviteToken(value: string): string | null {
  try {
    const url = new URL(value.trim(), window.location.origin);
    if (url.origin !== window.location.origin) return null;
    return url.pathname.match(/^\/invite\/([A-Za-z0-9_-]+)\/?$/)?.[1] ?? null;
  } catch {
    return null;
  }
}

export function JoinProjectDialog({
  triggerLabel = "Join project",
  iconOnly = false,
  triggerTourTarget,
}: JoinProjectDialogProps) {
  const [open, setOpen] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const inputId = useId();
  const navigate = useNavigate();
  const acceptInvite = useAcceptInviteLink();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getInviteToken(inviteUrl);
    if (!token) {
      toast.error("Paste a valid PSU-Collab invite link.");
      return;
    }

    acceptInvite.mutate(token, {
      onSuccess: (result) => {
        toast.success(
          result.already_member
            ? "You're already a member of this project."
            : "You've joined the project.",
        );
        setOpen(false);
        setInviteUrl("");
        navigate("/dashboard", { replace: true });
      },
      onError: (error) => {
        const status = (
          error as { response?: { status?: number } }
        )?.response?.status;
        if (status === 401) {
          navigate(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
          return;
        }
        toast.error(
          status === 404 || status === 410
            ? "This invite link is invalid, expired, or no longer active."
            : "Couldn't join with this invite link. Please try again.",
        );
      },
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setInviteUrl("");
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size={iconOnly ? "icon" : "default"}
          aria-label={iconOnly ? triggerLabel : undefined}
          title={iconOnly ? triggerLabel : undefined}
          data-tour={triggerTourTarget}
        >
          <Link2 className={iconOnly ? "size-4" : "mr-2 size-4"} />
          {!iconOnly && triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Join an existing project</DialogTitle>
            <DialogDescription>
              Paste a project invite link to join and continue to your dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="py-5">
            <Label htmlFor={inputId}>Project invite link</Label>
            <Input
              id={inputId}
              className="mt-2"
              type="url"
              placeholder="https://…/invite/…"
              value={inviteUrl}
              onChange={(event) => setInviteUrl(event.target.value)}
              required
              autoComplete="url"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={acceptInvite.isPending}>
              {acceptInvite.isPending ? "Joining..." : "Join project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
