import { useState, type ReactNode } from "react";
import type { CreateProjectResourceInput } from "@/types/resource";
import {
  Check,
  ChevronDown,
  Code2,
  FileText,
  FileUp,
  Frame,
  Link2,
  PlusCircle,
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

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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
  };

  const handleSubmit = async () => {
    const trimmedTitle = formValues.title.trim();
    const trimmedDescription = formValues.description.trim();
    const sourceUrl = formValues.source_url.trim();

    if (
      !trimmedTitle ||
      !trimmedDescription ||
      (!sourceUrl && !formValues.attachment)
    ) {
      return;
    }

    try {
      await onCreate({
        title: trimmedTitle,
        description: trimmedDescription,
        source_url: sourceUrl,
        category: formValues.category,
        attachment: formValues.attachment,
      });
    } catch {
      setSubmitError("Could not add the resource. Check your connection and try again.");
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

      <DialogContent className="sm:max-w-2xl dark:bg-background">
        <DialogHeader>
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

        <div className="grid gap-5 py-2 md:grid-cols-2">
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
              rows={4}
            />
          </div>

          <div className="space-y-2">
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

          <div className="space-y-2">
            <Label htmlFor="resource-link">Resource link</Label>
            <div className="relative">
              <Link2 className="pointer-events-none absolute left-2.5 top-2 size-4 text-muted-foreground" />
              <Input
                id="resource-link"
                type="url"
                value={formValues.source_url}
                onChange={(event) =>
                  updateField("source_url", event.target.value)
                }
                placeholder="https://example.com"
                className="pl-8"
              />
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="resource-attachment">Or attach a file</Label>
            <div className="flex items-center gap-3">
              <Input
                key={open ? "resource-file-open" : "resource-file-closed"}
                id="resource-attachment"
                type="file"
                onChange={(event) =>
                  updateField("attachment", event.target.files?.[0] ?? null)
                }
                className="h-10 pt-1.5"
              />
              <FileUp className="size-4 shrink-0 text-muted-foreground" />
            </div>
            {formValues.attachment && (
              <p className="text-xs text-muted-foreground">
                {formValues.attachment.name} ·{" "}
                {formatFileSize(formValues.attachment.size)}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { AddResoourceDialog };
