import { useState } from "react";
import { ChevronDown, CircleCheck, TriangleAlert } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useGetRevisionNotes } from "@/hooks/useRevisionNotes";
import type { RevisionNoteResponse } from "@/types/revision_note";

function formatWhen(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : formatDistanceToNow(date, { addSuffix: true });
}

function NoteBody({ note }: { note: RevisionNoteResponse }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Problem
        </p>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {note.problem}
        </p>
      </div>

      {note.recommended_changes && (
        <div>
          <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Recommended changes
          </p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {note.recommended_changes}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Shows the rejection history for a task. Renders nothing when the task
 * has never been rejected. Open (unresolved) notes are highlighted; resolved
 * ones are tucked into a collapsible "Previous revisions" list.
 */
export function TaskRevisionNotes({ taskId }: { taskId: string }) {
  const { data: notes = [] } = useGetRevisionNotes(taskId);
  const [historyOpen, setHistoryOpen] = useState(false);

  if (notes.length === 0) return null;

  const openNotes = notes.filter((n) => !n.resolved_at);
  const resolvedNotes = notes.filter((n) => n.resolved_at);

  return (
    <div className="mt-4 space-y-3">
      {openNotes.map((note) => (
        <div
          key={note.id}
          className="rounded-lg border border-red-200 bg-red-50/50 p-4 dark:border-red-500/30 dark:bg-red-500/10"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-red-700 dark:text-red-400">
              <TriangleAlert className="size-4" />
              Revision requested
            </p>
            <span className="text-xs text-muted-foreground">
              Revision #{note.revision_number} · {formatWhen(note.rejected_at)}
            </span>
          </div>
          <NoteBody note={note} />
        </div>
      ))}

      {resolvedNotes.length > 0 && (
        <div className="rounded-lg border border-border/60 bg-muted/10">
          <button
            type="button"
            onClick={() => setHistoryOpen((prev) => !prev)}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-foreground"
            aria-expanded={historyOpen}
          >
            <span>Previous revisions ({resolvedNotes.length})</span>
            <ChevronDown
              className={cn(
                "size-4 text-muted-foreground transition-transform",
                historyOpen && "rotate-180",
              )}
            />
          </button>

          {historyOpen && (
            <div className="divide-y divide-border/60 border-t border-border/60">
              {resolvedNotes.map((note) => (
                <div key={note.id} className="p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-green-700 dark:text-green-400">
                      <CircleCheck className="size-3.5" />
                      Resolved
                    </p>
                    <span className="text-xs text-muted-foreground">
                      Revision #{note.revision_number} ·{" "}
                      {formatWhen(note.rejected_at)}
                    </span>
                  </div>
                  <NoteBody note={note} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}