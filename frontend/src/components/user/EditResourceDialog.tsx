import { useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Check,
  ChevronDown,
  Code2,
  FileText,
  Frame,
  ImageIcon,
  Link2,
  Paperclip,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import type { UpdateProjectResourceInput } from "@/hooks/useResource";
import { cn } from "@/lib/utils";
import type { ProjectResource, ResourceCategory } from "@/types/resource";
import { useGetResourceLinks } from "@/hooks/useResourceLink";
import { ResourceLinks } from "@/components/user/ResourceLinks";
import { Spinner } from "../ui/spinner";
import DeleteResourceDialog from "./DeleteResourceDialog";

const CATEGORY_OPTIONS = [
  { name: "Links", icon: Frame },
  { name: "Paper Files", icon: FileText },
  { name: "Code", icon: Code2 },
] as const;

/** Client-side upload limit. */
const MAX_ATTACHMENT_SIZE_MB = 50;
const MAX_ATTACHMENT_BYTES = MAX_ATTACHMENT_SIZE_MB * 1024 * 1024;
const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i;

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* -------------------------------------------------------------------------- */
/* Local presentational pieces (same look as the Add dialog)                   */
/* -------------------------------------------------------------------------- */

function SectionHeader({
  icon: Icon,
  title,
  count,
}: {
  icon: typeof Link2;
  title: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 text-muted-foreground" />
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {count > 0 && (
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {count}
        </span>
      )}
    </div>
  );
}

function FileDropzone({
  onFile,
  disabled = false,
  hint,
}: {
  onFile: (file: File | undefined) => void;
  disabled?: boolean;
  hint: string;
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
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    onFile(e.dataTransfer.files[0]);
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label="Upload attachment"
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
      <Upload className="size-5 text-[#7A0C2E]" />
      <p className="text-sm text-foreground">
        <span className="font-medium text-[#7A0C2E]">{hint}</span> or drag a file here
      </p>
      <p className="text-xs text-muted-foreground">Up to {MAX_ATTACHMENT_SIZE_MB} MB per file</p>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        tabIndex={-1}
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          // Reset so picking the same file again still fires onChange.
          e.target.value = "";
        }}
      />
    </div>
  );
}

function FileRow({
  name,
  meta,
  actions,
}: {
  name: string;
  meta?: string;
  actions?: ReactNode;
}) {
  const Icon = IMAGE_EXTENSIONS.test(name) ? ImageIcon : FileText;

  return (
    <li className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/10 px-3 py-2">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[#FBF3E7] text-[#7A0C2E]">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{name}</p>
        {meta && <p className="text-xs text-muted-foreground">{meta}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* Form                                                                        */
/* -------------------------------------------------------------------------- */

interface EditResourceDialogProps {
  resource: ProjectResource | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (resourceId: string, values: UpdateProjectResourceInput) => Promise<void>;
  isPending?: boolean;
  onDelete: (resourceId: string) => void;
  isDeleting?: boolean;
}

interface EditFormProps {
  resource: ProjectResource;
  onCancel: () => void;
  onUpdate: EditResourceDialogProps["onUpdate"];
  isPending: boolean;
  onDelete: EditResourceDialogProps["onDelete"];
  isDeleting: boolean;
}

function EditForm({
  resource,
  onCancel,
  onUpdate,
  isPending,
  onDelete,
  isDeleting,
}: EditFormProps) {
  const [title, setTitle] = useState(resource.title);
  const [category, setCategory] = useState<ResourceCategory>(resource.category);
  const [description, setDescription] = useState(resource.description);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Links are added/removed through <ResourceLinks />; we only need load state here.
  const {
    data: links = [],
    isLoading: linksLoading,
    isError: linksError,
    refetch,
  } = useGetResourceLinks(resource.id);

  const existingFile = resource.file ?? null;

  const SelectedCategoryIcon =
    CATEGORY_OPTIONS.find((option) => option.name === category)?.icon ?? Frame;

  const handleFile = (file: File | undefined) => {
    if (!file) return;

    if (file.size === 0) {
      toast.error(`"${file.name}" is empty and was skipped.`);
      return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      toast.error(`"${file.name}" is over the ${MAX_ATTACHMENT_SIZE_MB} MB limit.`);
      return;
    }
    setAttachment(file);
  };

  async function handleSubmit() {
    setSubmitError(null);

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedTitle) {
      toast.error("Title is required.");
      return;
    }
    if (!trimmedDescription) {
      toast.error("Description is required.");
      return;
    }
    if (!linksLoading && links.length === 0 && !existingFile && !attachment) {
      toast.error("Add a resource link or attach a file.");
      return;
    }

    const values: UpdateProjectResourceInput = {
      title: trimmedTitle,
      category,
      description: trimmedDescription,
    };
    if (attachment) values.attachment = attachment;

    try {
      await onUpdate(resource.id, values);
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      setSubmitError(detail ?? "Could not update the resource. Please try again.");
    }
  }

  return (
    <>
      <DialogHeader className="shrink-0 border-b px-6 py-4">
        <DialogTitle>Edit resource</DialogTitle>
        <DialogDescription>Update the details, link, or attached file.</DialogDescription>
        {submitError && (
          <p className="text-sm text-destructive" role="alert">
            {submitError}
          </p>
        )}
      </DialogHeader>

      {/* min-h-0 + flex-1 lets this area scroll while header/footer stay pinned */}
      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-6 py-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="edit-resource-title">Title</Label>
            <Input
              id="edit-resource-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="edit-resource-description">Description</Label>
            <Textarea
              id="edit-resource-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="edit-resource-category">Category</Label>
            <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="edit-resource-category"
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={categoryOpen}
                  className="w-full justify-between text-left font-normal"
                >
                  <span className="flex items-center gap-2">
                    <SelectedCategoryIcon className="size-4 text-muted-foreground" />
                    {category || "Select category"}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>

              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <div className="p-1">
                  {CATEGORY_OPTIONS.map(({ name, icon: CategoryIcon }) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        setCategory(name);
                        setCategoryOpen(false);
                      }}
                      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-neutral-100"
                    >
                      <span className="flex items-center gap-2">
                        <CategoryIcon className="size-4 text-muted-foreground" />
                        {name}
                      </span>
                      {category === name && <Check className="h-4 w-4 text-[#7A0C2E]" />}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Attachment */}
          <section className="space-y-2 border-t pt-4 md:col-span-2">
            <SectionHeader
              icon={Paperclip}
              title="Attachment"
              count={attachment || existingFile ? 1 : 0}
            />

            {attachment ? (
              <ul className="space-y-2">
                <FileRow
                  name={attachment.name}
                  meta={
                    existingFile
                      ? `${formatFileSize(attachment.size)} · replaces ${existingFile.filename}`
                      : formatFileSize(attachment.size)
                  }
                  actions={
                    <button
                      type="button"
                      onClick={() => setAttachment(null)}
                      className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      aria-label={`Remove ${attachment.name}`}
                    >
                      <X className="size-4" />
                    </button>
                  }
                />
              </ul>
            ) : (
              <>
                {existingFile && (
                  <ul className="space-y-2">
                    <FileRow
                      name={existingFile.filename}
                      meta={`${formatFileSize(existingFile.size)} · current file`}
                    />
                  </ul>
                )}
                <FileDropzone
                  onFile={handleFile}
                  disabled={isPending}
                  hint={existingFile ? "Click to replace" : "Click to upload"}
                />
              </>
            )}

            <p className="text-xs text-muted-foreground">
              Add a link, attach a file, or both.
            </p>
          </section>

          {/* Resource links (multiple links via resource_links table) */}
          <section className="space-y-2 border-t pt-4 md:col-span-2">
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
            ) : (
              // Always rendered (even with 0 links) so the first link can be added.
              <ResourceLinks resourceId={resource.id} />
            )}
          </section>
        </div>
      </div>

      <DialogFooter className="shrink-0 border-t bg-muted/40 px-6 pt-3 sm:justify-between">
        {/* Far left: delete (asks for confirmation first) */}
        <Button
          type="button"
          variant="outline"
          onClick={() => setDeleteOpen(true)}
          disabled={isPending || isDeleting}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>

        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending || isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isPending || isDeleting}
            className="bg-(--maroon) text-white hover:bg-(--maroon)/90"
          >
            <Save className="mr-2 h-4 w-4" />
            {isPending ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </DialogFooter>

      <DeleteResourceDialog
        resource={resource}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={onDelete}
        isDeleting={isDeleting}
      />
    </>
  );
}

export default function EditResourceDialog({
  resource,
  open,
  onOpenChange,
  onUpdate,
  isPending = false,
  onDelete,
  isDeleting = false,
}: EditResourceDialogProps) {
  if (!resource) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl dark:bg-background">
        {/* key resets the form state whenever a different resource is edited */}
        <EditForm
          key={resource.id}
          resource={resource}
          onCancel={() => onOpenChange(false)}
          onUpdate={onUpdate}
          isPending={isPending}
          onDelete={onDelete}
          isDeleting={isDeleting}
        />
      </DialogContent>
    </Dialog>
  );
}