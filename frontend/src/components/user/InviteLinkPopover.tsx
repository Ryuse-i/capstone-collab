import { useState } from "react";
import { Check, Copy, Link2, Paperclip, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

import {
  buildInviteUrl,
  useCreateInviteLink,
  useGetProjectInviteLinks,
  useRevokeInviteLink,
} from "@/hooks/useInviteLink";
import type { InviteRole } from "@/types/inviteLinks";

const ROLE_OPTIONS: { value: InviteRole; label: string }[] = [
  { value: "member", label: "Member" },
  { value: "instructor", label: "Instructor" },
  { value: "advisor", label: "Advisor" },
];

const ROLE_LABELS: Record<InviteRole, string> = {
  member: "Project member",
  instructor: "Instructor",
  advisor: "Advisor",
};

// navigator.clipboard only exists on https / localhost, so keep a fallback
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

interface Props {
  projectId: string;
}

export function InviteLinkPopover({ projectId }: Props) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<InviteRole>("member");
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const createMutation = useCreateInviteLink();
  const revokeMutation = useRevokeInviteLink();
  const {
    data: activeLinks = [],
    isLoading: linksLoading,
    isError: linksError,
    refetch,
  } = useGetProjectInviteLinks(open ? projectId : "");

  const handleCopy = async (text: string) => {
    const ok = await copyText(text);
    if (!ok) {
      toast.error("Couldn't copy. Select the link and copy it manually.");
      return;
    }
    setCopied(true);
    toast.success("Link copied");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerate = () => {
    createMutation.mutate(
      { project_id: projectId, role },
      {
        onSuccess: (result) => {
          setLink(buildInviteUrl(result.token));
          setCopied(false);
        },
        onError: (err) => {
          const detail = (err as { response?: { data?: { detail?: string } } })
            .response?.data?.detail;
          toast.error(detail ?? "Could not create the invite link.");
        },
      },
    );
  };

  const handleRevoke = (id: string) => {
    revokeMutation.mutate(id, {
      onSuccess: () => toast.success("Invite link revoked"),
      onError: () => toast.error("Could not revoke the invite link."),
    });
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          // the raw token can't be shown again, so don't keep it around
          setLink(null);
          setCopied(false);
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Invite link">
          <Paperclip className="size-4" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-96 space-y-4 p-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Invite with a link
          </h3>
          <p className="text-xs text-muted-foreground">
            Anyone with the link can join this project. Expires in 7 days.
          </p>
        </div>

        {/* Role picker */}
        <div className="space-y-2">
          <Label>Role</Label>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted/40 p-1">
            {ROLE_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setRole(value);
                  setLink(null); // the old link grants the old role
                }}
                className={cn(
                  "rounded-md px-2 py-1.5 text-sm transition-colors",
                  role === value
                    ? "bg-(--maroon) font-medium text-white"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <Button
          type="button"
          onClick={handleGenerate}
          disabled={createMutation.isPending}
          className="w-full bg-(--maroon) text-white hover:bg-(--maroon)/90"
        >
          {createMutation.isPending ? (
            <>
              <Spinner className="mr-2 size-4" />
              Generating...
            </>
          ) : (
            <>
              <Link2 className="mr-2 size-4" />
              Generate link
            </>
          )}
        </Button>

        {/* Freshly generated link */}
        {link && (
          <div className="space-y-2 rounded-lg bg-[#FBF3E7] p-3 dark:bg-muted/30">
            <div className="flex gap-2">
              <Input
                readOnly
                value={link}
                onFocus={(e) => e.currentTarget.select()}
                className="bg-background text-xs"
                aria-label="Invite link"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => void handleCopy(link)}
                aria-label="Copy link"
                className="shrink-0"
              >
                {copied ? (
                  <Check className="size-4 text-[#7A0C2E]" />
                ) : (
                  <Copy className="size-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Copy it now. For security the link can't be shown again.
            </p>
          </div>
        )}

        {/* Active links */}
        <section className="space-y-2 border-t pt-4">
          <div className="flex items-center gap-2">
            <Link2 className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">
              Active links
            </h3>
            {activeLinks.length > 0 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {activeLinks.length}
              </span>
            )}
          </div>

          {linksLoading ? (
            <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
              <Spinner className="size-4" />
              Loading links...
            </div>
          ) : linksError ? (
            <div className="flex items-center justify-between gap-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <span>Couldn't load links.</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void refetch()}
              >
                Retry
              </Button>
            </div>
          ) : activeLinks.length === 0 ? (
            <p className="text-xs text-muted-foreground">No active links.</p>
          ) : (
            <ul className="custom-scrollbar max-h-40 space-y-2 overflow-y-auto">
              {activeLinks.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/10 px-3 py-2"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[#FBF3E7] text-[#7A0C2E]">
                    <Link2 className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {ROLE_LABELS[l.role]}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {l.use_count}/{l.max_uses ?? "∞"} used · expires{" "}
                      {new Date(l.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRevoke(l.id)}
                    disabled={revokeMutation.isPending}
                    aria-label={`Revoke ${ROLE_LABELS[l.role]} link`}
                    className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </PopoverContent>
    </Popover>
  );
}