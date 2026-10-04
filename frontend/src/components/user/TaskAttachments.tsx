import {
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { formatDistanceToNow } from "date-fns";
import {
  FileText,
  ImageIcon,
  Paperclip,
  Trash2,
  Upload,
  X,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useCurrentUser } from "@/hooks/useAuth";
import {
  useGetTaskAttachments,
  useUploadTaskAttachment,
  useDeleteTaskAttachment,
  useGetAttachmentUrl,
} from "@/hooks/useTaskAttachment";
import { cn } from "@/lib/utils";
import type { TaskAttachmentResponse } from "@/types/task_attachment";

/* -------------------------------------------------------------------------- */
/* Config                                                                      */
/* -------------------------------------------------------------------------- */

/** Client-side upload limit. Change this one number to adjust it everywhere. */
export const MAX_ATTACHMENT_SIZE_MB = 50;
const MAX_ATTACHMENT_BYTES = MAX_ATTACHMENT_SIZE_MB * 1024 * 1024;

/**
 * Field adapters. These are the ONLY places that know the shape of
 * TaskAttachmentResponse. If your type uses different field names, change
 * them here and nothing else needs to move.
 */
const getAttachmentName = (a: TaskAttachmentResponse): string =>
  a.file.filename;
const getAttachmentSize = (a: TaskAttachmentResponse): number | null =>
  a.file.size ?? null;
const getAttachmentCreatedAt = (a: TaskAttachmentResponse): string | null =>
  a.created_at ?? null;
// The uploader lives on the underlying file, not the task_attachment link row.
const getAttachmentOwnerId = (a: TaskAttachmentResponse): string | null =>
  a.file.uploaded_by != null ? String(a.file.uploaded_by) : null;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i;

function FileTypeIcon({ name }: { name: string }) {
  const Icon = IMAGE_EXTENSIONS.test(name) ? ImageIcon : FileText;
  return <Icon className="size-4" />;
}

/** Drops empty files and files over the size limit, telling the user why. */
function filterValidFiles(files: File[]): File[] {
  const valid: File[] = [];

  for (const file of files) {
    if (file.size === 0) {
      toast.error(`"${file.name}" is empty and was skipped.`);
    } else if (file.size > MAX_ATTACHMENT_BYTES) {
      toast.error(
        `"${file.name}" is over the ${MAX_ATTACHMENT_SIZE_MB} MB limit.`,
      );
    } else {
      valid.push(file);
    }
  }

  return valid;
}

/* -------------------------------------------------------------------------- */
/* Presentational pieces                                                       */
/* -------------------------------------------------------------------------- */

function AttachmentsHeader({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-2">
      <Paperclip className="size-4 text-muted-foreground" />
      <h3 className="text-sm font-semibold text-foreground">Attachments</h3>
      {count > 0 && (
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {count}
        </span>
      )}
    </div>
  );
}

function AttachmentDropzone({
  onFiles,
  busy = false,
  disabled = false,
}: {
  onFiles: (files: File[]) => void;
  busy?: boolean;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const openPicker = () => {
    if (!disabled) inputRef.current?.click();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openPicker();
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) setDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    // Ignore leave events fired when moving over a child element.
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setDragging(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    onFiles(Array.from(e.dataTransfer.files));
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label="Upload attachments"
      onClick={openPicker}
      onKeyDown={handleKeyDown}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed px-4 py-5 text-center transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7A0C2E]/40",
        dragging
          ? "border-[#7A0C2E] bg-[#FBF3E7]"
          : "border-border hover:border-[#7A0C2E]/50 hover:bg-[#FBF3E7]/50",
        disabled && "pointer-events-none opacity-60",
      )}
    >
      {busy ? (
        <Spinner className="size-5 text-[#7A0C2E]" />
      ) : (
        <Upload className="size-5 text-[#7A0C2E]" />
      )}

      <p className="text-sm text-foreground">
        {busy ? (
          "Uploading..."
        ) : (
          <>
            <span className="font-medium text-[#7A0C2E]">Click to upload</span>{" "}
            or drag files here
          </>
        )}
      </p>

      <p className="text-xs text-muted-foreground">
        Up to {MAX_ATTACHMENT_SIZE_MB} MB per file
      </p>

      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        tabIndex={-1}
        onChange={(e) => {
          onFiles(Array.from(e.target.files ?? []));
          // Reset so picking the same file again still fires onChange.
          e.target.value = "";
        }}
      />
    </div>
  );
}

function AttachmentRow({
  name,
  meta,
  onOpen,
  opening = false,
  actions,
}: {
  name: string;
  meta?: string;
  onOpen?: () => void;
  opening?: boolean;
  actions?: ReactNode;
}) {
  return (
    <li className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/10 px-3 py-2">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[#FBF3E7] text-[#7A0C2E]">
        <FileTypeIcon name={name} />
      </div>

      <div className="min-w-0 flex-1">
        {onOpen ? (
          <button
            type="button"
            onClick={onOpen}
            disabled={opening}
            title="Open file"
            className="group flex max-w-full items-center gap-1.5 text-left text-sm font-medium text-foreground hover:text-[#7A0C2E] focus-visible:outline-none focus-visible:underline disabled:opacity-60"
          >
            <span className="truncate">{name}</span>
            {opening ? (
              <Spinner className="size-3.5 shrink-0" />
            ) : (
              <ExternalLink className="size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
            )}
          </button>
        ) : (
          <p className="truncate text-sm font-medium text-foreground">{name}</p>
        )}

        {meta && <p className="text-xs text-muted-foreground">{meta}</p>}
      </div>

      {actions && (
        <div className="flex shrink-0 items-center gap-1">{actions}</div>
      )}
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* TaskAttachments: connected to the API (Edit + View dialogs)                */
/* -------------------------------------------------------------------------- */

export interface TaskAttachmentsProps {
  taskId: string | number;
  className?: string;
}

/**
 * Lists, uploads, opens, and deletes attachments for an existing task.
 * Anyone who can see it can upload; only the uploader sees the delete button.
 * Changes are saved immediately, independent of any parent form's Save button.
 */
export function TaskAttachments({ taskId, className }: TaskAttachmentsProps) {
  const id = String(taskId);

  const { data: currentUser } = useCurrentUser();
  const {
    data: attachments = [],
    isLoading,
    isError,
    refetch,
  } = useGetTaskAttachments(id);

  const uploadMutation = useUploadTaskAttachment();
  const deleteMutation = useDeleteTaskAttachment();
  const urlMutation = useGetAttachmentUrl();

  const [uploadingCount, setUploadingCount] = useState(0);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const handleFiles = async (files: File[]) => {
    const valid = filterValidFiles(files);
    if (valid.length === 0) return;

    setUploadingCount((count) => count + valid.length);

    const results = await Promise.allSettled(
      valid.map((file) => uploadMutation.mutateAsync({ task_id: id, file })),
    );

    setUploadingCount((count) => count - valid.length);

    results.forEach((result, index) => {
      if (result.status === "rejected") {
        toast.error(`Couldn't upload "${valid[index].name}". Try again.`);
      }
    });
  };

  const handleOpen = (attachment: TaskAttachmentResponse) => {
    // Open the tab synchronously (inside the click) so popup blockers allow it,
    // then point it at the signed URL once we have it.
    const tab = window.open("", "_blank");

    urlMutation.mutate(attachment.id, {
      onSuccess: (url) => {
        if (tab) {
          tab.opener = null;
          tab.location.href = url;
        } else {
          window.open(url, "_blank", "noopener,noreferrer");
        }
      },
      onError: () => {
        tab?.close();
        toast.error("Couldn't open this file. Try again.");
      },
    });
  };

  const handleDelete = (attachment: TaskAttachmentResponse) => {
    deleteMutation.mutate(
      { attachment_id: attachment.id, task_id: id },
      {
        onSuccess: () => setConfirmingId(null),
        onError: () => toast.error("Couldn't delete this file. Try again."),
      },
    );
  };

  const isOwner = (attachment: TaskAttachmentResponse) => {
    const ownerId = getAttachmentOwnerId(attachment);
    return (
      currentUser?.id != null &&
      ownerId !== null &&
      ownerId === String(currentUser.id)
    );
  };

  return (
    <section className={cn("space-y-3", className)}>
      <AttachmentsHeader count={attachments.length} />

      <AttachmentDropzone onFiles={handleFiles} busy={uploadingCount > 0} />

      {isLoading ? (
        <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
          <Spinner className="size-4" />
          Loading attachments...
        </div>
      ) : isError ? (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <span>Couldn't load attachments.</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
          >
            Retry
          </Button>
        </div>
      ) : attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No attachments yet.</p>
      ) : (
        <ul className="space-y-2">
          {attachments.map((attachment) => {
            const name = getAttachmentName(attachment);
            const size = getAttachmentSize(attachment);
            const createdAt = getAttachmentCreatedAt(attachment);

            const meta = [
              size !== null ? formatFileSize(size) : null,
              createdAt
                ? `Added ${formatDistanceToNow(new Date(createdAt), {
                    addSuffix: true,
                  })}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ");

            const isDeleting =
              deleteMutation.isPending &&
              deleteMutation.variables?.attachment_id === attachment.id;
            const isOpening =
              urlMutation.isPending && urlMutation.variables === attachment.id;
            const confirming = confirmingId === attachment.id;

            return (
              <AttachmentRow
                key={attachment.id}
                name={name}
                meta={meta}
                onOpen={() => handleOpen(attachment)}
                opening={isOpening}
                actions={
                  !isOwner(attachment) ? null : confirming ? (
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
                        onClick={() => handleDelete(attachment)}
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
                      onClick={() => setConfirmingId(attachment.id)}
                      className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-rose-600"
                      aria-label={`Delete ${name}`}
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
/* PendingAttachments: local queue for the Add dialog                          */
/* -------------------------------------------------------------------------- */

export interface PendingAttachmentsProps {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
  className?: string;
}

const fileKey = (f: File) => `${f.name}:${f.size}:${f.lastModified}`;

/**
 * Holds files in the parent's state until the task exists. The parent is
 * responsible for uploading them after the task is created successfully.
 */
export function PendingAttachments({
  files,
  onChange,
  disabled = false,
  className,
}: PendingAttachmentsProps) {
  const handleFiles = (incoming: File[]) => {
    const existing = new Set(files.map(fileKey));
    const next = filterValidFiles(incoming).filter(
      (file) => !existing.has(fileKey(file)),
    );

    if (next.length > 0) onChange([...files, ...next]);
  };

  const removeFile = (target: File) =>
    onChange(files.filter((file) => fileKey(file) !== fileKey(target)));

  return (
    <section className={cn("space-y-3", className)}>
      <AttachmentsHeader count={files.length} />

      <AttachmentDropzone onFiles={handleFiles} disabled={disabled} />

      {files.length > 0 ? (
        <ul className="space-y-2">
          {files.map((file) => (
            <AttachmentRow
              key={fileKey(file)}
              name={file.name}
              meta={formatFileSize(file.size)}
              actions={
                <button
                  type="button"
                  onClick={() => removeFile(file)}
                  disabled={disabled}
                  className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="size-4" />
                </button>
              }
            />
          ))}
        </ul>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Files are uploaded after the task is created.
      </p>
    </section>
  );
}