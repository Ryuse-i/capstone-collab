import { useRef, useState } from "react";
import type { AxiosError } from "axios";
import { format, isValid, parseISO } from "date-fns";
import {
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Upload,
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

import { useExtractPaper, useUploadPaper } from "@/hooks/useExtract";
import { cn } from "@/lib/utils";
import type { ExtractedPaper } from "@/types/extract";

const MAX_FILE_MB = 20;
const ACCEPTED_TYPES = ["application/pdf"];

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

interface UploadPaperDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

/**
 * Safely parses YYYY, YYYY-MM or YYYY-MM-DD strings (and, as a fallback,
 * free-form strings like "March 2023") into a local Date.
 */
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

export default function UploadPaperDialog({
  open,
  onOpenChange,
}: UploadPaperDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentFileRef = useRef<File | null>(null);

  const extractPaper = useExtractPaper();
  const uploadPaper = useUploadPaper();

  const [title, setTitle] = useState("");
  const [abstract, setAbstract] = useState("");
  const [authors, setAuthors] = useState("");
  const [keywords, setKeywords] = useState("");
  const [category, setCategory] = useState("");
  const [researchProblem, setResearchProblem] = useState("");
  const [methodology, setMethodology] = useState("");
  const [conclusion, setConclusion] = useState("");
  const [publishedDate, setPublishedDate] = useState(""); // Stores YYYY-MM-01
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [datePickerOpen, setDatePickerOpen] = useState(false);
  // Year currently shown in the month grid (separate from the saved value so
  // the user can browse years without committing a date).
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());

  const extracting = extractPaper.isPending;
  const uploading = uploadPaper.isPending;
  const fieldsDisabled = extracting || uploading;

  const reset = () => {
    setTitle("");
    setAbstract("");
    setAuthors("");
    setKeywords("");
    setCategory("");
    setResearchProblem("");
    setMethodology("");
    setConclusion("");
    setPublishedDate("");
    setFile(null);
    setFileError(null);
    setSubmitError(null);
    setDatePickerOpen(false);
    currentFileRef.current = null;
    extractPaper.reset();
    uploadPaper.reset();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleOpenChange = (next: boolean) => {
    if (uploading || extracting) return;
    if (!next) reset();
    onOpenChange(next);
  };

  /** Fills the form from the extraction result. */
  const applyExtracted = (data: ExtractedPaper) => {
    setTitle(data.title ?? "");
    setAbstract(data.abstract ?? "");
    setAuthors((data.authors ?? []).join(", "));
    setKeywords((data.keywords ?? []).join(", "));
    setCategory(data.category ?? "");
    setResearchProblem(data.research_problem ?? "");
    setMethodology(data.methodology ?? "");
    setConclusion(data.conclusion ?? "");

    const parsed = data.published_date
      ? parsePublishedDate(data.published_date)
      : undefined;
    setPublishedDate(
      parsed ? toMonthString(parsed.getFullYear(), parsed.getMonth()) : "",
    );
  };

  const clearFile = () => {
    setFile(null);
    currentFileRef.current = null;
    extractPaper.reset();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (!picked) return;

    if (!ACCEPTED_TYPES.includes(picked.type)) {
      clearFile();
      setFileError("Only PDF files are supported.");
      return;
    }
    if (picked.size > MAX_FILE_MB * 1024 * 1024) {
      clearFile();
      setFileError(`File must be ${MAX_FILE_MB} MB or smaller.`);
      return;
    }

    setFileError(null);
    setSubmitError(null);
    setFile(picked);
    currentFileRef.current = picked;

    extractPaper.mutate(picked, {
      onSuccess: (data) => {
        if (currentFileRef.current === picked) applyExtracted(data);
      },
    });
  };

  const canSubmit = Boolean(
    title.trim() && abstract.trim() && file && !fieldsDisabled,
  );

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!file || !canSubmit) return;
    setSubmitError(null);

    uploadPaper.mutate(
      {
        file,
        title: title.trim(),
        abstract: abstract.trim(),
        authors: splitList(authors),
        keywords: splitList(keywords),
        category: category.trim(),
        research_problem: researchProblem.trim(),
        methodology: methodology.trim(),
        conclusion: conclusion.trim(),
        published_date: publishedDate, // YYYY-MM-01, or "" if not set
      },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
        },
        onError: (err) =>
          setSubmitError(errorMessage(err, "Could not save the paper.")),
      },
    );
  };

  const parsedDate = parsePublishedDate(publishedDate);

  const handleDatePickerOpenChange = (next: boolean) => {
    if (next) {
      // Start the grid on the saved year (or the current year if none).
      setPickerYear(parsedDate?.getFullYear() ?? new Date().getFullYear());
    }
    setDatePickerOpen(next);
  };

  const selectMonth = (monthIndex: number) => {
    setPublishedDate(toMonthString(pickerYear, monthIndex));
    setDatePickerOpen(false);
  };

  return (
    <Drawer
      open={open}
      onOpenChange={handleOpenChange}
      direction="right"
      dismissible={!fieldsDisabled}
    >
      <DrawerContent className="ml-auto h-full w-full overflow-hidden rounded-none p-0 sm:max-w-2xl">
        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <DrawerHeader className="shrink-0 border-b px-6 py-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <DrawerTitle>Add to research repository</DrawerTitle>
                <DrawerDescription className="mt-1">
                  Upload a capstone paper and the details are filled in
                  automatically. Review them before saving. It becomes
                  searchable once saved.
                </DrawerDescription>
              </div>

              <DrawerClose asChild>
                <button
                  type="button"
                  disabled={fieldsDisabled}
                  className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                  aria-label="Close upload paper"
                >
                  <X className="size-4" />
                </button>
              </DrawerClose>
            </div>
          </DrawerHeader>

          {/* min-h-0 + flex-1 lets this area scroll while the footer stays pinned */}
          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-6 py-6">
            <div className="space-y-6">
              {/* File picker */}
              <div className="space-y-2">
                <Label htmlFor="paper-file">Paper file (PDF)</Label>
                <input
                  ref={fileInputRef}
                  id="paper-file"
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {file ? (
                  <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      aria-label="Remove file"
                      disabled={fieldsDisabled}
                      onClick={clearFile}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-20 w-full border-dashed"
                    disabled={fieldsDisabled}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Choose a PDF (up to {MAX_FILE_MB} MB)
                  </Button>
                )}
                {fileError && (
                  <p className="text-sm text-destructive">{fileError}</p>
                )}
              </div>

              {extracting && (
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing the paper…
                </div>
              )}
              {extractPaper.isError && (
                <p className="text-sm text-destructive">
                  {errorMessage(
                    extractPaper.error,
                    "Could not analyze this file.",
                  )}{" "}
                  You can still fill in the fields manually.
                </p>
              )}

              <div className="space-y-2">
                <Label htmlFor="paper-title">Title</Label>
                <Input
                  id="paper-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={fieldsDisabled}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paper-abstract">Abstract</Label>
                <Textarea
                  id="paper-abstract"
                  rows={5}
                  value={abstract}
                  onChange={(e) => setAbstract(e.target.value)}
                  disabled={fieldsDisabled}
                  required
                />
              </div>

              <div className="grid gap-x-5 gap-y-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="paper-authors">Authors</Label>
                  <Input
                    id="paper-authors"
                    placeholder="Separate names with commas"
                    value={authors}
                    onChange={(e) => setAuthors(e.target.value)}
                    disabled={fieldsDisabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paper-category">Category</Label>
                  <Input
                    id="paper-category"
                    placeholder="e.g. Machine Learning"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    disabled={fieldsDisabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paper-keywords">Keywords</Label>
                  <Input
                    id="paper-keywords"
                    placeholder="e.g. machine learning, healthcare"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    disabled={fieldsDisabled}
                  />
                </div>

                {/* Published month & year picker */}
                <div className="space-y-2">
                  <Label htmlFor="paper-date">Published date</Label>
                  <Popover
                    open={datePickerOpen}
                    onOpenChange={handleDatePickerOpenChange}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        id="paper-date"
                        type="button"
                        variant="outline"
                        disabled={fieldsDisabled}
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
                <Label htmlFor="paper-problem">Research problem</Label>
                <Textarea
                  id="paper-problem"
                  rows={3}
                  value={researchProblem}
                  onChange={(e) => setResearchProblem(e.target.value)}
                  disabled={fieldsDisabled}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paper-method">Methodology</Label>
                <Textarea
                  id="paper-method"
                  rows={3}
                  value={methodology}
                  onChange={(e) => setMethodology(e.target.value)}
                  disabled={fieldsDisabled}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paper-conclusion">Conclusion</Label>
                <Textarea
                  id="paper-conclusion"
                  rows={3}
                  value={conclusion}
                  onChange={(e) => setConclusion(e.target.value)}
                  disabled={fieldsDisabled}
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
              disabled={fieldsDisabled}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {uploading ? "Uploading…" : "Add paper"}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}