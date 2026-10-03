import { useState, useRef } from "react";
import { useGetTaskCommentsByTask, useCreateTaskComment, useUpdateTaskComment, useDeleteTaskComment } from "@/hooks/useTaskComment";
import { useCurrentUser } from "@/hooks/useAuth";
import type { TaskCommentResponse, CreateTaskComment, UpdateTaskComment } from "@/types/taskComment";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ChevronDown, Trash2 } from "lucide-react";

interface TaskCommentsProps {
  taskId: string;
}

export function TaskComments({ taskId }: TaskCommentsProps) {
  const [textareaValue, setTextareaValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editCommentId, setEditCommentId] = useState<string | null>(null);
  const [editTextareaValue, setEditTextareaValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: currentUser } = useCurrentUser();
  const { data: comments = [] as TaskCommentResponse[], isLoading, error } = useGetTaskCommentsByTask(taskId);
  const { mutateAsync: createMutate, isPending: isCreating } = useCreateTaskComment();
  const { mutateAsync: updateMutate, isPending: isUpdating } = useUpdateTaskComment();
  const { mutateAsync: deleteMutate } = useDeleteTaskComment();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textareaValue.trim() || isCreating || !currentUser) return;

    setIsSubmitting(true);
    try {
      const newComment: CreateTaskComment = {
        task_id: taskId,
        author_id: currentUser.id,
        content: textareaValue.trim()
      };

      await createMutate(newComment);
      setTextareaValue("");
      if (textareaRef.current) {
        textareaRef.current.blur();
      }
      toast.success("Comment posted");
    } catch (_err) {
      void _err;
      toast.error("Failed to post comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const form = e.currentTarget.closest("form");
      if (form) {
        form.dispatchEvent(new Event("submit"));
      }
    }
  };

  const startEdit = (commentId: string) => {
    setEditCommentId(commentId);
    const comment = comments.find((c: TaskCommentResponse) => c.id === commentId);
    if (comment) {
      setEditTextareaValue(comment.content);
    }
  };

  const cancelEdit = () => {
    setEditCommentId(null);
    setEditTextareaValue("");
  };

  const saveEdit = async (commentId: string) => {
    if (!editTextareaValue.trim() || isUpdating) return;

    try {
      const updatedComment: UpdateTaskComment = {
        content: editTextareaValue.trim()
      };

      await updateMutate({ id: commentId, task_comment: updatedComment });
      cancelEdit();
      toast.success("Comment updated");
    } catch (_err) {
      void _err;
      toast.error("Failed to update comment");
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      // In a real app, we would show a confirmation dialog first
      // For now, we'll delete directly
      await deleteMutate({ id: commentId, taskId } as { id: string; taskId?: string });
      toast.success("Comment deleted");
    } catch (_err) {
      void _err;
      toast.error("Failed to delete comment");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-start space-x-3">
            <Skeleton className="h-7 w-7 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-2 w-24" />
              <Skeleton className="h-1.5 w-32" />
              <Skeleton className="h-1.5 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-muted-foreground py-8">Failed to load comments</div>;
  }

  return (
    <div className="space-y-6">
      <div className="border-t pt-4">
        <h3 className="text-lg font-semibold text-foreground mb-2">Comments ({comments.length})</h3>

        {comments.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No comments yet. Be the first to comment!
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment: TaskCommentResponse) => (
              <div key={comment.id} className="flex items-start space-x-3">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {comment.author_id
                        ? String(comment.author_id).charAt(0).toUpperCase()
                        : "?"
                      }
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Comment content */}
                <div className="flex-1 space-y-2">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 text-sm">
                    <div className="flex items-center gap-1">
                      {/* Author initials */}
                      <span className="font-medium">
                        {comment.author_id
                          ? String(comment.author_id).charAt(0).toUpperCase()
                          : "?"
                        }
                      </span>
                      <time
                        dateTime={comment.created_at}
                        title={new Date(comment.created_at).toLocaleString()}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </time>

                      {/* Edited indicator */}
                      {new Date(comment.updated_at) > new Date(comment.created_at) && (
                        <span className="text-xs text-muted-foreground ml-1">(edited)</span>
                      )}
                    </div>

                    {/* Comment menu for own comments */}
                    {currentUser && comment.author_id === currentUser.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="p-1 rounded-hover">
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-24 p-0">
                          <DropdownMenuItem onClick={() => startEdit(comment.id)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(_e: React.MouseEvent) => handleDelete(comment.id)} className="text-destructive flex items-center space-x-2">
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  {/* Comment text */}
                  <div className="whitespace-pre-wrap break-words text-sm text-foreground">
                    {comment.content}
                  </div>

                  {/* Edit mode */}
                  {editCommentId === comment.id && (
                    <div className="mt-2">
                      <Textarea
                        value={editTextareaValue}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditTextareaValue(e.target.value)}
                        placeholder="Update your comment..."
                        rows={2}
                        className="resize-none"
                      />
                      <div className="flex justify-end space-x-2 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={cancelEdit}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => saveEdit(comment.id)}
                          disabled={isUpdating || !editTextareaValue.trim()}
                        >
                          {isUpdating ? "Saving..." : "Save"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="flex items-start space-x-3">
        {currentUser ? (
          <Avatar className="h-8 w-8">
            <AvatarFallback>
              {currentUser.first_name?.charAt(0) || currentUser.email?.charAt(0) || "?"}
              {currentUser.last_name?.charAt(0)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <Avatar className="h-8 w-8">
            <AvatarFallback>
              YT
            </AvatarFallback>
          </Avatar>
        )}
        <form onSubmit={handleSubmit} className="flex-1 space-y-2">
          <Label htmlFor="task-comment-textarea" className="sr-only">
            Add a comment...
          </Label>
          <Textarea
            ref={textareaRef}
            id="task-comment-textarea"
            value={textareaValue}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTextareaValue(e.target.value)}
            placeholder="Add a comment..."
            rows={1}
            onKeyDown={handleKeyDown}
            className="resize-none"
          >
          </Textarea>
          <div className="flex justify-end">
            <Button
              type="submit"
              variant="default"
              disabled={isSubmitting || !textareaValue.trim()}
            >
              {isSubmitting ? "Posting..." : "Comment"}
            </Button>
          </div>
        </form>
      </div>

      <Toaster />
    </div>
  );
}