import {
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import type { CreateProjectResourceInput } from "@/types/resource";
import {
  Check,
  ChevronDown,
  Code2,
  FileText,
  Frame,
  ImageIcon,
  Link2,
  Paperclip,
  PlusCircle,
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

export type ResourceFormValues = CreateProjectResourceInput;

const initialFormValues: ResourceFormValues = {
  title: "",
  category: "Links",
  description: "",
  source_url: "",
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

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Turns user input into a safe http(s) URL, or null if it isn't one.
 * "example.com/x" becomes "https://example.com/x"; javascript:, data:,
 * mailto:, etc. are rejected.
 */
function normalizeUrl(raw: string): string | null {
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
    if (!parsed.hostname.includes(".") && parsed.hostname !== "localhost") {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Local presentational pieces                                                 */
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
    // Ignore leave events fired when moving over a child element.
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

      {actions && (
        <div className="flex shrink-0 items-center gap-1">{actions}</div>
      )}
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* Dialog                                                                      */
/* -------------------------------------------------------------------------- */

interface AddResoourceDialogProps {
  trigger?: ReactNode;
  onCreate: (resource: ResourceFormValues) => Promise<void>;
  isPending?: boolean;
}

export default function AddResoourceDialog({
  trigger,
  onCreate,
  isPending = false,
}: AddResoourceDialogProps) {
  const [open, setOpen] = useState(false);
  const [formValues, setFormValues] =
    useState<ResourceFormValues>(initialFormValues);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

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
    setLinkError(null);
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
    const trimmedTitle = formValues.title.trim();
    const trimmedDescription = formValues.description.trim();
    const rawUrl = formValues.source_url.trim();

    if (!trimmedTitle) {
      toast.error("Title is required.");
      return;
    }

    if (!trimmedDescription) {
      toast.error("Description is required.");
      return;
    }

    if (!rawUrl && !formValues.attachment) {
      toast.error("Add a resource link or attach a file.");
      return;
    }

    let sourceUrl = "";
    if (rawUrl) {
      const normalized = normalizeUrl(rawUrl);
      if (!normalized) {
        setLinkError("Enter a valid web link, like https://example.com");
        return;
      }
      sourceUrl = normalized;
    }

    try {
      // The success / error toasts for the request itself come from
      // useCreateProjectResource, so they aren't duplicated here.
      await onCreate({
        title: trimmedTitle,
        description: trimmedDescription,
        source_url: sourceUrl,
        category: formValues.category,
        attachment: formValues.attachment,
      });
    } catch {
      setSubmitError(
        "Could not add the resource. Check your connection and try again.",
      );
      return;
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
            Add a link or attach a file for your team.
          </DialogDescription>
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
              <Label htmlFor="resource-title">Title</Label>
              <Input
                id="resource-title"
                value={formValues.title}
                onChange={(event) => updateField("title", event.target.value)}
                placeholder="Capstone UI Mockups"
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
                          className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-neutral-100"
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

            {/* Resource link */}
            <section className="space-y-2 border-t pt-4 md:col-span-2">
              <SectionHeader
                icon={Link2}
                title="Link"
                count={formValues.source_url.trim() ? 1 : 0}
              />

              <Input
                id="resource-link"
                type="url"
                inputMode="url"
                aria-label="Resource link"
                aria-invalid={!!linkError}
                placeholder="Paste a link, e.g. https://docs.google.com/..."
                value={formValues.source_url}
                onChange={(event) => {
                  updateField("source_url", event.target.value);
                  if (linkError) setLinkError(null);
                }}
              />

              {linkError && (
                <p className="text-xs text-rose-600">{linkError}</p>
              )}
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
                        className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label={`Remove ${formValues.attachment.name}`}
                      >
                        <X className="size-4" />
                      </button>
                    }
                  />
                </ul>
              ) : (
                <FileDropzone onFile={handleFile} disabled={isPending} />
              )}

              <p className="text-xs text-muted-foreground">
                Add a link, attach a file, or both.
              </p>
            </section>
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t bg-muted/40 px-6 py-3 ">
          <div className="mb-3">
            <Button
              type="button"
              variant="outline"
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
              disabled={isPending}
              className="bg-(--maroon) text-white hover:bg-(--maroon)/90"
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

export { AddResoourceDialog };
