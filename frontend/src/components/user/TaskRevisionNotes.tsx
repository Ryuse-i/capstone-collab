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

interface TaskRevisionNotesProps {
  taskId: string;
  /** Heading for the latest note. The reviewer drawer passes "Previous revision". */
  title?: string;
}

/**
 * Shows the rejection history for a task. Renders nothing when the task has
 * never been rejected. The most recent note is always shown in full; every
 * older note is tucked into a collapsible "Previous revisions" list,
 * whether or not it has been resolved.
 */
export function TaskRevisionNotes({
  taskId,
  title = "Revision requested",
}: TaskRevisionNotesProps) {
  const { data: notes = [] } = useGetRevisionNotes(taskId);
  const [historyOpen, setHistoryOpen] = useState(false);

  if (notes.length === 0) return null;

  // Newest first
  const [latest, ...older] = [...notes].sort(
    (a, b) => b.revision_number - a.revision_number,
  );
  const latestIsOpen = !latest.resolved_at;

  return (
    <div className="mt-4 space-y-3">
      <div
        className={cn(
          "rounded-lg border p-4",
          latestIsOpen
            ? "border-red-200 bg-red-50/50 dark:border-red-500/30 dark:bg-red-500/10"
            : "border-border/60 bg-muted/10",
        )}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          {latestIsOpen ? (
            <p className="flex items-center gap-1.5 text-sm font-semibold text-red-700 dark:text-red-400">
              <TriangleAlert className="size-4" />
              {title}
            </p>
          ) : (
            <p className="flex items-center gap-1.5 text-sm font-semibold text-green-700 dark:text-green-400">
              <CircleCheck className="size-4" />
              {title} (resolved)
            </p>
          )}
          <span className="text-xs text-muted-foreground">
            Revision #{latest.revision_number} · {formatWhen(latest.rejected_at)}
          </span>
        </div>
        <NoteBody note={latest} />
      </div>

      {older.length > 0 && (
        <div className="rounded-lg border border-border/60 bg-muted/10">
          <button
            type="button"
            onClick={() => setHistoryOpen((prev) => !prev)}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-foreground"
            aria-expanded={historyOpen}
          >
            <span>Previous revisions ({older.length})</span>
            <ChevronDown
              className={cn(
                "size-4 text-muted-foreground transition-transform",
                historyOpen && "rotate-180",
              )}
            />
          </button>

          {historyOpen && (
            <div className="divide-y divide-border/60 border-t border-border/60">
              {older.map((note) => (
                <div key={note.id} className="p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      {note.resolved_at && (
                        <>
                          <CircleCheck className="size-3.5 text-green-600 dark:text-green-400" />
                          Resolved
                        </>
                      )}
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