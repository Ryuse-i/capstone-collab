import {
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import {
  Check,
  ChevronDown,
  Code2,
  FileText,
  Frame,
  ImageIcon,
  Paperclip,
  PlusCircle,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { CreateProjectResourceInput } from "@/types/resource";
import {
  PendingLinks,
  type PendingLink,
} from "@/components/user/ResourceLinks";
import { useCreateResourceLink } from "@/hooks/useResourceLink";

/* -------------------------------------------------------------------------- */
/* Config & Types                                                             */
/* -------------------------------------------------------------------------- */

export type ResourceFormValues = CreateProjectResourceInput;

const initialFormValues: ResourceFormValues = {
  title: "",
  category: "Links",
  description: "",
  // Links are now handled by <PendingLinks /> and saved as resource links
  // after the resource is created, so the single source_url stays empty.
  attachment: null,
};

const CATEGORY_OPTIONS = [
  { name: "Links", icon: Frame },
  { name: "Paper Files", icon: FileText },
  { name: "Code", icon: Code2 },
] as const;

/** Client-side upload limit. */
const MAX_ATTACHMENT_SIZE_MB = 50;
const MAX_ATTACHMENT_BYTES = MAX_ATTACHMENT_SIZE_MB * 1024 * 1024;
const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* -------------------------------------------------------------------------- */
/* Local Presentational Subcomponents                                         */
/* -------------------------------------------------------------------------- */

function SectionHeader({
  icon: Icon,
  title,
  count,
}: {
  icon: LucideIcon;
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
}: {
  onFile: (file: File | undefined) => void;
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
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setDragging(false);
    }
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
        <span className="font-medium text-[#7A0C2E]">Click to upload</span> or
        drag a file here
      </p>

      <p className="text-xs text-muted-foreground">
        Up to {MAX_ATTACHMENT_SIZE_MB} MB per file
      </p>

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        tabIndex={-1}
        onChange={(e) => {
          onFile(e.target.files?.[0]);
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

      {actions && (
        <div className="flex shrink-0 items-center gap-1">{actions}</div>
      )}
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* Main Component                                                             */
/* -------------------------------------------------------------------------- */

export interface AddResourceDialogProps {
  trigger?: ReactNode;
  /**
   * Must resolve with the created resource so its id can be used to attach
   * the pending links. If you have a named response type (e.g.
   * ProjectResourceResponse), use it here instead of `{ id: string }`.
   */
  onCreate: (resource: ResourceFormValues) => Promise<{ id: string }>;
  isPending?: boolean;
}

export default function AddResourceDialog({
  trigger,
  onCreate,
  isPending = false,
}: AddResourceDialogProps) {
  const [open, setOpen] = useState(false);
  const [formValues, setFormValues] =
    useState<ResourceFormValues>(initialFormValues);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Pending links to be added after the resource is created.
  const [pendingLinks, setPendingLinks] = useState<PendingLink[]>([]);
  const createResourceLinkMutation = useCreateResourceLink();

  // True while the resource or its links are being saved.
  const busy = isPending || createResourceLinkMutation.isPending;

  const updateField = <K extends keyof ResourceFormValues>(
    field: K,
    value: ResourceFormValues[K],
  ) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormValues(initialFormValues);
    setCategoryOpen(false);
    setSubmitError(null);
    setPendingLinks([]);
  };

  const handleFile = (file: File | undefined) => {
    if (!file) return;

    if (file.size === 0) {
      toast.error(`"${file.name}" is empty and was skipped.`);
      return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      toast.error(
        `"${file.name}" is over the ${MAX_ATTACHMENT_SIZE_MB} MB limit.`,
      );
      return;
    }

    updateField("attachment", file);
  };

  const handleSubmit = async () => {
    if (busy) return;

    const trimmedTitle = formValues.title.trim();
    const trimmedDescription = formValues.description.trim();

    if (!trimmedTitle) {
      toast.error("Title is required.");
      return;
    }

    if (!trimmedDescription) {
      toast.error("Description is required.");
      return;
    }

    if (pendingLinks.length === 0 && !formValues.attachment) {
      toast.error("Add at least one link or attach a file.");
      return;
    }

    setSubmitError(null);

    // Step 1: create the resource. Only a failure here is reported as
    // "could not add the resource".
    let createdResource: { id: string };
    try {
      createdResource = await onCreate({
        title: trimmedTitle,
        description: trimmedDescription,
        category: formValues.category,
        attachment: formValues.attachment,
      });
    } catch {
      setSubmitError(
        "Could not add the resource. Check your connection and try again.",
      );
      return;
    }

    // Step 2: attach the links to the newly created resource.
    if (pendingLinks.length > 0) {
      const results = await Promise.allSettled(
        pendingLinks.map((link) =>
          createResourceLinkMutation.mutateAsync({
            resource_id: createdResource.id,
            link: { url: link.url, title: link.title },
          }),
        ),
      );

      const failed = results.filter(
        (result) => result.status === "rejected",
      ).length;

      if (failed > 0) {
        toast.error(
          `Resource was created, but ${failed} of ${pendingLinks.length} link(s) failed to save. You can add them by editing the resource.`,
        );
      }
    }

    resetForm();
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) resetForm();
      }}
    >
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}

      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl dark:bg-background">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle>Add Resource</DialogTitle>
          <DialogDescription>
            Add links or attach a file for your team.
          </DialogDescription>
          {submitError && (
            <p className="text-sm text-destructive" role="alert">
              {submitError}
            </p>
          )}
        </DialogHeader>

        {/* Scrollable body section */}
        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="resource-title">Title</Label>
              <Input
                id="resource-title"
                value={formValues.title}
                onChange={(event) => updateField("title", event.target.value)}
                placeholder="Capstone UI Mockups"
                disabled={busy}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="resource-description">Description</Label>
              <Textarea
                id="resource-description"
                value={formValues.description}
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
                placeholder="Final screen designs and interaction flows for the capstone system."
                rows={3}
                disabled={busy}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="resource-category">Category</Label>
              <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="resource-category"
                    variant="outline"
                    role="combobox"
                    aria-expanded={categoryOpen}
                    disabled={busy}
                    className="w-full justify-between text-left font-normal"
                  >
                    {(() => {
                      const CategoryIcon =
                        CATEGORY_OPTIONS.find(
                          (category) => category.name === formValues.category,
                        )?.icon ?? Frame;
                      return (
                        <span className="flex items-center gap-2">
                          <CategoryIcon className="size-4 text-muted-foreground" />
                          {formValues.category || "Select category"}
                        </span>
                      );
                    })()}
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>

                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <div className="p-1">
                    {CATEGORY_OPTIONS.map(({ name, icon: CategoryIcon }) => {
                      const selected = formValues.category === name;

                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => {
                            updateField("category", name);
                            setCategoryOpen(false);
                          }}
                          className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                        >
                          <span className="flex items-center gap-2">
                            <CategoryIcon className="size-4 text-muted-foreground" />
                            {name}
                          </span>
                          {selected && (
                            <Check className="h-4 w-4 text-[#7A0C2E]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Links (replaces the old single-link input) */}
            <section className="border-t pt-4 md:col-span-2">
              <PendingLinks
                links={pendingLinks}
                onChange={setPendingLinks}
                disabled={busy}
              />
            </section>

            {/* Attachment */}
            <section className="space-y-2 border-t pt-4 md:col-span-2">
              <SectionHeader
                icon={Paperclip}
                title="Attachment"
                count={formValues.attachment ? 1 : 0}
              />

              {formValues.attachment ? (
                <ul className="space-y-2">
                  <FileRow
                    name={formValues.attachment.name}
                    meta={formatFileSize(formValues.attachment.size)}
                    actions={
                      <button
                        type="button"
                        onClick={() => updateField("attachment", null)}
                        disabled={busy}
                        className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label={`Remove ${formValues.attachment.name}`}
                      >
                        <X className="size-4" />
                      </button>
                    }
                  />
                </ul>
              ) : (
                <FileDropzone onFile={handleFile} disabled={busy} />
              )}

              <p className="text-xs text-muted-foreground">
                Add at least one link or attach a file. You can add both.
              </p>
            </section>
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t bg-muted/40 px-6 py-2">
          <div className="flex w-full items-center justify-end gap-2 mb-4">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => {
                resetForm();
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={busy}
              className="bg-[#7A0C2E] text-white hover:bg-[#7A0C2E]/90"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add resource
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { AddResourceDialog };
