import { useEffect, useRef, useState } from "react";
import type { AxiosError } from "axios";
import { format, isValid, parseISO } from "date-fns";
import {
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  FileText,
  RefreshCw,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";

import { useUpdatePaper, useUploadPaperFile } from "@/hooks/usePapers";
import { cn } from "@/lib/utils";
import type { PaperResponse } from "@/types/capstoneresults";

const MAX_FILE_MB = 20;
const ACCEPTED_TYPES = ["application/pdf"];

/** Some browsers/OSes report an empty MIME type for PDFs. */
function isPdf(file: File): boolean {
  return (
    ACCEPTED_TYPES.includes(file.type) ||
    (file.type === "" && file.name.toLowerCase().endsWith(".pdf"))
  );
}

const MIN_YEAR = 1970;
const MAX_YEAR = 2035;
const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

interface EditPaperDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The paper being edited. Form is re-populated whenever it opens. */
  paper: PaperResponse | null | undefined;
  /** Called after a successful save. */
  onSaved?: (paper: PaperResponse) => void;
}

/** Splits a comma-separated string into trimmed, non-empty values. */
function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

/** Pulls the FastAPI `detail` message out of an axios error, if there is one. */
function errorMessage(err: unknown, fallback: string): string {
  const detail = (err as AxiosError<{ detail?: unknown }>)?.response?.data
    ?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return (
      detail
        .map((d) => (typeof d?.msg === "string" ? d.msg : ""))
        .filter(Boolean)
        .join("; ") || fallback
    );
  }
  return err instanceof Error ? err.message : fallback;
}

/** Safely parses YYYY, YYYY-MM or YYYY-MM-DD (or free-form) into a local Date. */
function parsePublishedDate(dateStr: string): Date | undefined {
  if (!dateStr) return undefined;
  const trimmed = dateStr.trim();

  let normalized = trimmed;
  if (/^\d{4}$/.test(trimmed)) normalized = `${trimmed}-01-01`;
  else if (/^\d{4}-\d{2}$/.test(trimmed)) normalized = `${trimmed}-01`;

  const iso = parseISO(normalized);
  if (isValid(iso)) return iso;

  const fallback = new Date(trimmed);
  return isValid(fallback) ? fallback : undefined;
}

/** Formats a year + zero-based month as YYYY-MM-01 without timezone drift. */
function toMonthString(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`;
}

export default function EditPaperDrawer({
  open,
  onOpenChange,
  paper,
  onSaved,
}: EditPaperDrawerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updatePaper = useUpdatePaper();
  const uploadFile = useUploadPaperFile();

  const [title, setTitle] = useState("");
  const [abstract, setAbstract] = useState("");
  const [authors, setAuthors] = useState("");
  const [keywords, setKeywords] = useState("");
  const [category, setCategory] = useState("");
  const [researchProblem, setResearchProblem] = useState("");
  const [methodology, setMethodology] = useState("");
  const [publishedDate, setPublishedDate] = useState(""); // YYYY-MM-01
  const [newFile, setNewFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());

  const saving = updatePaper.isPending || uploadFile.isPending;

  /** Populate the form from the paper each time the drawer opens. */
  useEffect(() => {
    if (!open || !paper) return;

    setTitle(paper.title ?? "");
    setAbstract(paper.abstract ?? "");
    setAuthors((paper.authors ?? []).join(", "));
    setKeywords((paper.keywords ?? []).join(", "));
    setCategory(paper.category ?? "");
    setResearchProblem(paper.research_problem ?? "");
    setMethodology(paper.methodology ?? "");

    const parsed = paper.published_date
      ? parsePublishedDate(paper.published_date)
      : undefined;
    setPublishedDate(
      parsed ? toMonthString(parsed.getFullYear(), parsed.getMonth()) : "",
    );

    setNewFile(null);
    setFileError(null);
    setSubmitError(null);
    setDatePickerOpen(false);
    updatePaper.reset();
    uploadFile.reset();
    if (fileInputRef.current) fileInputRef.current.value = "";
    // Only re-run when the drawer opens or a different paper is targeted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, paper?.id]);

  const handleOpenChange = (next: boolean) => {
    if (saving) return;
    onOpenChange(next);
  };

  const clearNewFile = () => {
    setNewFile(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (!picked) return;

    if (!isPdf(picked)) {
      clearNewFile();
      setFileError("Only PDF files are supported.");
      return;
    }
    if (picked.size > MAX_FILE_MB * 1024 * 1024) {
      clearNewFile();
      setFileError(`File must be ${MAX_FILE_MB} MB or smaller.`);
      return;
    }

    setFileError(null);
    setNewFile(picked);
  };

  const parsedDate = parsePublishedDate(publishedDate);

  const handleDatePickerOpenChange = (next: boolean) => {
    if (next) {
      setPickerYear(parsedDate?.getFullYear() ?? new Date().getFullYear());
    }
    setDatePickerOpen(next);
  };

  const selectMonth = (monthIndex: number) => {
    setPublishedDate(toMonthString(pickerYear, monthIndex));
    setDatePickerOpen(false);
  };

  const canSubmit = Boolean(
    paper && title.trim() && abstract.trim() && !saving,
  );

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!paper || !canSubmit) return;
    setSubmitError(null);

    try {
      let saved = await updatePaper.mutateAsync({
        id: paper.id,
        paper: {
          title: title.trim(),
          abstract: abstract.trim(),
          authors: splitList(authors),
          keywords: splitList(keywords),
          category: category.trim(),
          research_problem: researchProblem.trim(),
          methodology: methodology.trim(),
          published_date: publishedDate || null,
        },
      });

      if (newFile) {
        saved = await uploadFile.mutateAsync({ id: paper.id, file: newFile });
      }

      onSaved?.(saved);
      onOpenChange(false);
    } catch (err) {
      setSubmitError(errorMessage(err, "Could not save changes."));
    }
  };

  return (
    <Drawer
      open={open}
      onOpenChange={handleOpenChange}
      direction="right"
      dismissible={!saving}
    >
      <DrawerContent className="ml-auto h-full w-full overflow-hidden rounded-none p-0 sm:max-w-2xl">
        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <DrawerHeader className="shrink-0 border-b px-6 py-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <DrawerTitle>Edit paper</DrawerTitle>
                <DrawerDescription className="mt-1">
                  Update the details of this paper. You can also replace the
                  PDF file.
                </DrawerDescription>
              </div>

              <DrawerClose asChild>
                <button
                  type="button"
                  disabled={saving}
                  className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                  aria-label="Close edit paper"
                >
                  <X className="size-4" />
                </button>
              </DrawerClose>
            </div>
          </DrawerHeader>

          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-6 py-6">
            <div className="space-y-6">
              {/* Optional file replacement */}
              <div className="space-y-2">
                <Label htmlFor="edit-paper-file">Paper file (PDF)</Label>
                <input
                  ref={fileInputRef}
                  id="edit-paper-file"
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />

                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  {newFile ? (
                    <>
                      <span className="flex-1 truncate">{newFile.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {(newFile.size / 1024 / 1024).toFixed(1)} MB · will
                        replace current
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        aria-label="Discard new file"
                        disabled={saving}
                        onClick={clearNewFile}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 truncate text-muted-foreground">
                        Current file kept
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7"
                        disabled={saving}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <RefreshCw className="mr-1.5 h-3 w-3" />
                        Replace
                      </Button>
                    </>
                  )}
                </div>
                {fileError && (
                  <p className="text-sm text-destructive">{fileError}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-paper-title">Title</Label>
                <Input
                  id="edit-paper-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={saving}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-paper-abstract">Abstract</Label>
                <Textarea
                  id="edit-paper-abstract"
                  rows={5}
                  value={abstract}
                  onChange={(e) => setAbstract(e.target.value)}
                  disabled={saving}
                  required
                />
              </div>

              {/* Authors Section */}
              <div className="space-y-2">
                <Label htmlFor="edit-paper-authors">Authors</Label>
                <Textarea
                  id="edit-paper-authors"
                  rows={2}
                  placeholder="Separate names with commas"
                  value={authors}
                  onChange={(e) => setAuthors(e.target.value)}
                  disabled={saving}
                />
              </div>

              {/* Keywords Section */}
              <div className="space-y-2">
                <Label htmlFor="edit-paper-keywords">Keywords</Label>
                <Textarea
                  id="edit-paper-keywords"
                  rows={2}
                  placeholder="e.g. machine learning, healthcare"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  disabled={saving}
                />
              </div>

              {/* Category & Published date shared section */}
              <div className="grid gap-x-5 gap-y-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-paper-category">Category</Label>
                  <Input
                    id="edit-paper-category"
                    placeholder="e.g. Machine Learning"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    disabled={saving}
                  />
                </div>

                {/* Published month & year picker */}
                <div className="space-y-2">
                  <Label htmlFor="edit-paper-date">Published date</Label>
                  <Popover
                    open={datePickerOpen}
                    onOpenChange={handleDatePickerOpenChange}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        id="edit-paper-date"
                        type="button"
                        variant="outline"
                        disabled={saving}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !parsedDate && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {parsedDate
                          ? format(parsedDate, "MMMM yyyy")
                          : "Pick month and year"}
                      </Button>
                    </PopoverTrigger>

                    <PopoverContent className="w-64 p-3" align="start">
                      <div className="mb-3 flex items-center justify-between">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label="Previous year"
                          disabled={pickerYear <= MIN_YEAR}
                          onClick={() => setPickerYear((y) => y - 1)}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>

                        <span className="text-sm font-medium">
                          {pickerYear}
                        </span>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label="Next year"
                          disabled={pickerYear >= MAX_YEAR}
                          onClick={() => setPickerYear((y) => y + 1)}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5">
                        {MONTH_LABELS.map((label, monthIndex) => {
                          const selected =
                            parsedDate?.getFullYear() === pickerYear &&
                            parsedDate?.getMonth() === monthIndex;

                          return (
                            <button
                              key={label}
                              type="button"
                              onClick={() => selectMonth(monthIndex)}
                              className={cn(
                                "rounded-md px-2 py-2 text-sm transition-colors hover:bg-neutral-100",
                                selected &&
                                  "bg-[#7A0C2E] text-white hover:bg-[#7A0C2E]",
                              )}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>

                      {parsedDate && (
                        <button
                          type="button"
                          onClick={() => {
                            setPublishedDate("");
                            setDatePickerOpen(false);
                          }}
                          className="mt-3 w-full rounded-md py-1.5 text-xs text-muted-foreground hover:bg-neutral-100"
                        >
                          Clear date
                        </button>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-paper-problem">Research problem</Label>
                <Textarea
                  id="edit-paper-problem"
                  rows={3}
                  value={researchProblem}
                  onChange={(e) => setResearchProblem(e.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-paper-method">Methodology</Label>
                <Textarea
                  id="edit-paper-method"
                  rows={3}
                  value={methodology}
                  onChange={(e) => setMethodology(e.target.value)}
                  disabled={saving}
                />
              </div>

              {submitError && (
                <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {submitError}
                </p>
              )}
            </div>
          </div>

          <DrawerFooter className="shrink-0 flex-row items-center justify-end gap-2 border-t bg-muted/40 px-6 py-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}