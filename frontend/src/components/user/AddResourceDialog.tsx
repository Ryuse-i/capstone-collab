import { useState, type ReactNode } from "react";
import { Check, ChevronDown, PlusCircle } from "lucide-react";
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

export type ResourceFormValues = {
  id: number;
  title: string;
  category: "Links" | "Paper Files" | "Code";
  description: string;
  type: string;
  size: string;
  author: string;
  updatedAt: string;
  pinned: boolean;
  uses: number;
};

const initialFormValues: ResourceFormValues = {
  id: Date.now(),
  title: "",
  category: "Links",
  description: "",
  type: "Live link",
  size: "",
  author: "",
  updatedAt: "Just now",
  pinned: false,
  uses: 0,
};

interface AddResoourceDialogProps {
  trigger?: ReactNode;
  onCreate?: (resource: ResourceFormValues) => void;
}

export default function AddResoourceDialog({
  trigger,
  onCreate,
}: AddResoourceDialogProps) {
  const [open, setOpen] = useState(false);
  const [formValues, setFormValues] =
    useState<ResourceFormValues>(initialFormValues);
  const [categoryOpen, setCategoryOpen] = useState(false);

  const updateField = <K extends keyof ResourceFormValues>(
    field: K,
    value: ResourceFormValues[K],
  ) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormValues({
      ...initialFormValues,
      id: Date.now(),
    });
    setCategoryOpen(false);
  };

  const handleSubmit = () => {
    const trimmedTitle = formValues.title.trim();
    const trimmedDescription = formValues.description.trim();
    const trimmedAuthor = formValues.author.trim();

    if (!trimmedTitle || !trimmedDescription || !trimmedAuthor) {
      return;
    }

    const resourceToCreate = {
      ...formValues,
      title: trimmedTitle,
      description: trimmedDescription,
      author: trimmedAuthor,
      updatedAt: formValues.updatedAt || "Just now",
      uses: Number(formValues.uses) || 0,
    };

    onCreate?.(resourceToCreate);
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
            Create a new resource with the same fields used by the current mock
            data.
          </DialogDescription>
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
                  <span>{formValues.category || "Select category"}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>

              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <div className="p-1">
                  {(["Links", "Paper Files", "Code"] as const).map(
                    (category) => {
                      const selected = formValues.category === category;

                      return (
                        <button
                          key={category}
                          type="button"
                          onClick={() => {
                            updateField("category", category);
                            setCategoryOpen(false);
                          }}
                          className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-neutral-100"
                        >
                          <span>{category}</span>
                          {selected && (
                            <Check className="h-4 w-4 text-[#7A0C2E]" />
                          )}
                        </button>
                      );
                    },
                  )}
                </div>
              </PopoverContent>
            </Popover>
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
            onClick={handleSubmit}
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
