import { useState, type KeyboardEvent, type ReactNode } from "react";
import { Link2, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useCurrentUser } from "@/hooks/useAuth";
import {
  useGetTaskLinks,
  useCreateTaskLink,
  useDeleteTaskLink,
} from "@/hooks/useTaskLink";
import { cn } from "@/lib/utils";
import type { TaskLinkResponse } from "@/types/task_link";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

export type PendingLink = { url: string; title: string | null };

/**
 * Turns user input into a safe http(s) URL, or null if it isn't one.
 * - "example.com/x" becomes "https://example.com/x"
 * - javascript:, data:, mailto:, etc. are rejected so they can never end up
 *   in an href.
 */
export function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const parsed = new URL(withScheme);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    // Reject things like "hello" that parse but aren't real hosts.
    if (!parsed.hostname.includes(".") && parsed.hostname !== "localhost") {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/* -------------------------------------------------------------------------- */
/* Presentational pieces                                                       */
/* -------------------------------------------------------------------------- */

function LinksHeader({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-2">
      <Link2 className="size-4 text-muted-foreground" />
      <h3 className="text-sm font-semibold text-foreground">Links</h3>
      {count > 0 && (
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {count}
        </span>
      )}
    </div>
  );
}

function AddLinkForm({
  onAdd,
  disabled = false,
}: {
  /** Resolve true when the link was accepted so the form can clear itself. */
  onAdd: (link: PendingLink) => Promise<boolean> | boolean;
  disabled?: boolean;
}) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const submit = async () => {
    if (adding || disabled) return;

    const normalized = normalizeUrl(url);
    if (!normalized) {
      setError("Enter a valid web link, like https://example.com");
      return;
    }

    setError(null);
    setAdding(true);
    const ok = await onAdd({ url: normalized, title: title.trim() || null });
    setAdding(false);

    if (ok) {
      setUrl("");
      setTitle("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void submit();
    }
  };

  return (
    <div className="space-y-2">
      <Input
        type="url"
        inputMode="url"
        aria-label="Link URL"
        aria-invalid={!!error}
        placeholder="Paste a link, e.g. https://docs.google.com/..."
        value={url}
        onChange={(e) => {
          setUrl(e.target.value);
          if (error) setError(null);
        }}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      />

      <div className="flex gap-2">
        <Input
          aria-label="Link title (optional)"
          placeholder="Title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          maxLength={120}
        />

        <Button
          type="button"
          variant="outline"
          onClick={() => void submit()}
          disabled={disabled || adding || !url.trim()}
          className="shrink-0"
        >
          {adding ? (
            <Spinner className="mr-1.5 size-4" />
          ) : (
            <Plus className="mr-1.5 size-4" />
          )}
          Add link
        </Button>
      </div>

      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}

function LinkRow({
  title,
  url,
  actions,
}: {
  title: string;
  url: string;
  actions?: ReactNode;
}) {
  return (
    <li className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/10 px-3 py-2">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[#FBF3E7] text-[#7A0C2E]">
        <Link2 className="size-4" />
      </div>

      <div className="min-w-0 flex-1">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block truncate text-sm font-medium text-foreground hover:text-[#7A0C2E] focus-visible:outline-none focus-visible:underline"
        >
          {title}
        </a>
        <p className="truncate text-xs text-muted-foreground">{url}</p>
      </div>

      {actions && (
        <div className="flex shrink-0 items-center gap-1">{actions}</div>
      )}
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* TaskLinks: connected to the API (Edit + View dialogs)                      */
/* -------------------------------------------------------------------------- */

export interface TaskLinksProps {
  taskId: string | number;
  className?: string;
}

/**
 * Lists, adds, and deletes links for an existing task.
 * Anyone who can see it can add; only the creator sees the delete button.
 * Changes are saved immediately, independent of any parent form's Save button.
 */
export function TaskLinks({ taskId, className }: TaskLinksProps) {
  const id = String(taskId);

  const { data: currentUser } = useCurrentUser();
  const {
    data: links = [],
    isLoading,
    isError,
    refetch,
  } = useGetTaskLinks(id);

  const createMutation = useCreateTaskLink();
  const deleteMutation = useDeleteTaskLink();

  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const handleAdd = async (link: PendingLink): Promise<boolean> => {
    try {
      await createMutation.mutateAsync({
        task_id: id,
        link: { url: link.url, title: link.title },
      });
      return true;
    } catch {
      toast.error("Couldn't add the link. Try again.");
      return false;
    }
  };

  const handleDelete = (link: TaskLinkResponse) => {
    deleteMutation.mutate(
      { link_id: link.id, task_id: id },
      {
        onSuccess: () => setConfirmingId(null),
        onError: () => toast.error("Couldn't delete the link. Try again."),
      },
    );
  };

  const isOwner = (link: TaskLinkResponse) =>
    currentUser?.id != null &&
    link.created_by !== null &&
    String(link.created_by) === String(currentUser.id);

  return (
    <section className={cn("space-y-3", className)}>
      <LinksHeader count={links.length} />

      <AddLinkForm onAdd={handleAdd} />

      {isLoading ? (
        <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
          <Spinner className="size-4" />
          Loading links...
        </div>
      ) : isError ? (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <span>Couldn't load links.</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
          >
            Retry
          </Button>
        </div>
      ) : links.length === 0 ? (
        <p className="text-sm text-muted-foreground">No links yet.</p>
      ) : (
        <ul className="space-y-2">
          {links.map((link) => {
            const label = link.title?.trim() || hostnameOf(link.url);
            const isDeleting =
              deleteMutation.isPending &&
              deleteMutation.variables?.link_id === link.id;
            const confirming = confirmingId === link.id;

            return (
              <LinkRow
                key={link.id}
                title={label}
                url={link.url}
                actions={
                  !isOwner(link) ? null : confirming ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmingId(null)}
                        disabled={isDeleting}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(link)}
                        disabled={isDeleting}
                      >
                        {isDeleting ? (
                          <>
                            <Spinner className="mr-1.5 size-3.5" />
                            Deleting...
                          </>
                        ) : (
                          "Delete"
                        )}
                      </Button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmingId(link.id)}
                      className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-rose-600"
                      aria-label={`Delete link ${label}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )
                }
              />
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* PendingLinks: local queue for the Add dialog                                */
/* -------------------------------------------------------------------------- */

export interface PendingLinksProps {
  links: PendingLink[];
  onChange: (links: PendingLink[]) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Holds links in the parent's state until the task exists. The parent is
 * responsible for creating them after the task is created successfully.
 */
export function PendingLinks({
  links,
  onChange,
  disabled = false,
  className,
}: PendingLinksProps) {
  const handleAdd = (link: PendingLink): boolean => {
    if (links.some((existing) => existing.url === link.url)) {
      toast.error("That link is already added.");
      return false;
    }
    onChange([...links, link]);
    return true;
  };

  return (
    <section className={cn("space-y-3", className)}>
      <LinksHeader count={links.length} />

      <AddLinkForm onAdd={handleAdd} disabled={disabled} />

      {links.length > 0 && (
        <ul className="space-y-2">
          {links.map((link) => (
            <LinkRow
              key={link.url}
              title={link.title?.trim() || hostnameOf(link.url)}
              url={link.url}
              actions={
                <button
                  type="button"
                  onClick={() =>
                    onChange(links.filter((l) => l.url !== link.url))
                  }
                  disabled={disabled}
                  className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                  aria-label={`Remove link ${link.title || hostnameOf(link.url)}`}
                >
                  <X className="size-4" />
                </button>
              }
            />
          ))}
        </ul>
      )}

      <p className="text-xs text-muted-foreground">
        Upload related links for the task.
      </p>
    </section>
  );
}