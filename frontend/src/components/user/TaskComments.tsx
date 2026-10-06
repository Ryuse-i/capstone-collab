import { useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Pencil, Trash2 } from "lucide-react";

import {
  useGetTaskCommentsByTask,
  useCreateTaskComment,
  useUpdateTaskComment,
  useDeleteTaskComment,
} from "@/hooks/useTaskComment";
// Adjust this import path to wherever useCurrentUser lives in your project.
import { useCurrentUser } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { TaskCommentResponseWithAuthor } from "@/types/taskComment";
import type { UserBase } from "@/types/user";

/**
 * Extracts author information from a comment that includes author data.
 */
function getAuthor(comment: TaskCommentResponseWithAuthor): UserBase | null {
  return comment.author ?? null;
}

function getAuthorName(comment: TaskCommentResponseWithAuthor): string {
  const author = getAuthor(comment);
  if (!author) return "Member";
  const full = [author.first_name, author.last_name].filter(Boolean).join(" ");
  return full || author.email || "Member";
}

function getInitials(comment: TaskCommentResponseWithAuthor): string {
  const author = getAuthor(comment);
  if (!author) return "?";
  const initials = `${author.first_name?.charAt(0) ?? ""}${author.last_name?.charAt(0) ?? ""}`;
  return (initials || getAuthorName(comment).charAt(0)).toUpperCase();
}

/**
 * Avatar styled the same as the one in NavUser's dropdown.
 */
function CommentAvatar({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <Avatar className={cn("h-8 w-8 shrink-0 rounded-full bg-primary", className)}>
      <AvatarFallback className="rounded-full font-bold ring-1 dark:bg-gray-800 dark:ring-gray-600">
        {label}
      </AvatarFallback>
    </Avatar>
  );
}

/**
 * Shared auto-growing textarea shell used by both the composer and the
 * inline editor, so they look and behave identically.
 */
function CommentInput({
  value,
  onChange,
  onSubmit,
  onCancel,
  placeholder,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  placeholder: string;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  return (
    <textarea
      ref={ref}
      rows={1}
      autoFocus={autoFocus}
      value={value}
      placeholder={placeholder}
      onChange={(e) => {
        onChange(e.target.value);
        resize();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          onSubmit();
        }
        if (e.key === "Escape" && onCancel) {
          e.preventDefault();
          onCancel();
        }
      }}
      className="custom-scrollbar max-h-50 min-h-9 w-full resize-none bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
    />
  );
}

function CommentItem({
  comment,
  taskId,
  isOwn,
}: {
  comment: TaskCommentResponseWithAuthor;
  taskId: string;
  isOwn: boolean;
}) {
  const updateMutation = useUpdateTaskComment();
  const deleteMutation = useDeleteTaskComment();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.content);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const isEdited =
    !!comment.updated_at && comment.updated_at !== comment.created_at;

  const handleSave = () => {
    const content = draft.trim();
    if (!content) return;

    // Nothing changed, just close the editor.
    if (content === comment.content) {
      setEditing(false);
      return;
    }

    updateMutation.mutate(
      { id: String(comment.id), task_comment: { content } },
      { onSuccess: () => setEditing(false) },
    );
  };

  const handleCancel = () => {
    setDraft(comment.content);
    setEditing(false);
  };

  return (
    <div className="group flex gap-3">
      <CommentAvatar label={getInitials(comment)} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">
            {getAuthorName(comment)}
          </span>

          {comment.created_at && (
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.created_at), {
                addSuffix: true,
              })}
              {isEdited && " · edited"}
            </span>
          )}

          {isOwn && !editing && !confirmingDelete && (
            <div className="ml-auto flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <button
                type="button"
                onClick={() => {
                  setDraft(comment.content);
                  setEditing(true);
                }}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Edit comment"
              >
                <Pencil className="size-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-600"
                aria-label="Delete comment"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          )}
        </div>

        {editing ? (
          <div className="mt-1.5">
            <div className="rounded-lg border border-input bg-background transition-shadow focus-within:border-[#7A0C2E]/40 focus-within:ring-2 focus-within:ring-[#7A0C2E]/10">
              <CommentInput
                autoFocus
                value={draft}
                onChange={setDraft}
                onSubmit={handleSave}
                onCancel={handleCancel}
                placeholder="Edit your comment..."
              />
            </div>

            <div className="mt-2 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!draft.trim() || updateMutation.isPending}
              >
                {updateMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>

            {updateMutation.isError && (
              <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                Couldn't update this comment. Please try again.
              </p>
            )}
          </div>
        ) : (
          <p className="mt-0.5 whitespace-pre-wrap wrap-break-word text-sm leading-relaxed text-foreground">
            {comment.content}
          </p>
        )}

        {confirmingDelete && (
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
            <span className="flex-1">Delete this comment?</span>
            <Button
              variant="outline"
              size="sm"
              className="h-7"
              onClick={() => setConfirmingDelete(false)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="h-7"
              disabled={deleteMutation.isPending}
              onClick={() =>
                deleteMutation.mutate(
                  { id: String(comment.id), taskId },
                  { onSettled: () => setConfirmingDelete(false) },
                )
              }
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export interface TaskCommentsProps {
  taskId: string | number;
  className?: string;
}

/**
 * Asana-style comment thread for a task: oldest-first conversation with the
 * composer pinned under it. Members can use it to talk to each other or leave
 * notes on the task. Authors can edit/delete their own comments.
 */
export function TaskComments({ taskId, className }: TaskCommentsProps) {
  const id = String(taskId);

  // If useCurrentUser returns the user directly (not a query result),
  // change this to: const user = useCurrentUser();
  const { data: user } = useCurrentUser();
  const currentUserId = user?.id != null ? String(user.id) : null;

  const currentUserInitials = (
    `${user?.first_name?.charAt(0) ?? ""}${user?.last_name?.charAt(0) ?? ""}` ||
    user?.email?.charAt(0) ||
    "Y"
  ).toUpperCase();

  const {
    data: comments = [],
    isLoading,
    isError,
  } = useGetTaskCommentsByTask(id);
  const createMutation = useCreateTaskComment();

  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);

  // Oldest first so it reads like a conversation.
  const sorted = [...comments].sort(
    (a, b) =>
      new Date(a.created_at ?? 0).getTime() -
      new Date(b.created_at ?? 0).getTime(),
  );

  const handleSubmit = () => {
    const content = draft.trim();
    if (!content || !currentUserId || createMutation.isPending) return;

    createMutation.mutate(
      { task_id: id, author_id: currentUserId, content },
      { onSuccess: () => setDraft("") },
    );
  };

  const showActions = focused || draft.length > 0;

  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2">
        <MessageSquare className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Comments</h3>
        {sorted.length > 0 && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {sorted.length}
          </span>
        )}
      </div>

      {/* Thread */}
      {isLoading ? (
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="flex animate-pulse gap-3">
              <div className="size-8 rounded-full bg-muted" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3 w-32 rounded bg-muted" />
                <div className="h-3 w-3/4 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          Couldn't load comments.
        </p>
      ) : sorted.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/80 bg-muted/10 px-4 py-6 text-center">
          <p className="text-sm font-medium text-foreground">No comments yet</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Start the conversation or leave a note for your teammates.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {sorted.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              taskId={id}
              isOwn={
                !!currentUserId && String(comment.author_id) === currentUserId
              }
            />
          ))}
        </div>
      )}

      {/* Composer */}
      <div className="flex gap-3">
        <CommentAvatar label={currentUserInitials} />

        <div className="min-w-0 flex-1">
          <div
            onFocus={() => setFocused(true)}
            onBlur={(e) => {
              // Stay "focused" while focus moves between the textarea and buttons.
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                setFocused(false);
              }
            }}
            className={cn(
              "rounded-lg border border-input bg-background transition-shadow",
              focused && "border-[#7A0C2E]/40 ring-2 ring-[#7A0C2E]/10",
            )}
          >
            <CommentInput
              value={draft}
              onChange={setDraft}
              onSubmit={handleSubmit}
              placeholder="Write a comment or note..."
            />
            <div
              className={cn(
                "flex items-center justify-between gap-2 px-3 pb-2",
                !showActions && "hidden",
              )}
            >
              <span className="text-xs text-muted-foreground">
                Ctrl/⌘ + Enter to send
              </span>

              <div className="flex items-center gap-2">
                {draft.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDraft("")}
                    disabled={createMutation.isPending}
                  >
                    Clear
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={
                    !draft.trim() || !currentUserId || createMutation.isPending
                  }
                >
                  {createMutation.isPending ? "Posting..." : "Comment"}
                </Button>
              </div>
            </div>
          </div>

          {createMutation.isError && (
            <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
              Couldn't post your comment. Please try again.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export default TaskComments;