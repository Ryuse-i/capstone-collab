import { useRef, useState } from "react";
import type { AxiosError } from "axios";
import { format, parseISO } from "date-fns";
import { CalendarIcon, FileText, Loader2, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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

/** Helper to safely parse YYYY-MM or YYYY-MM-DD ISO strings for formatting */
function parsePublishedDate(dateStr: string): Date | undefined {
  if (!dateStr) return undefined;
  const normalized = dateStr.length === 7 ? `${dateStr}-01` : dateStr;
  const parsed = parseISO(normalized);
  return !isNaN(parsed.getTime()) ? parsed : undefined;
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
    
    // Convert extracted date to YYYY-MM-01 format
    if (data.published_date) {
      const parsed = parsePublishedDate(data.published_date);
      setPublishedDate(parsed ? format(parsed, "yyyy-MM-01") : "");
    } else {
      setPublishedDate("");
    }
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

  const canSubmit = Boolean(title.trim() && abstract.trim() && file && !fieldsDisabled);

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
        published_date: publishedDate, // Sends valid ISO date YYYY-MM-01
      },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
        },
        onError: (err) =>
          setSubmitError(errorMessage(err, "Could not save the paper.")),
      }
    );
  };

  const parsedDate = parsePublishedDate(publishedDate);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Add to research repository</DialogTitle>
            <DialogDescription>
              Upload a capstone paper and the details are filled in
              automatically. Review them before saving. It becomes searchable
              once saved.
            </DialogDescription>
          </DialogHeader>

          {/* File picker */}
          <div className="flex flex-col gap-2">
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
                className="h-20 border-dashed"
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
              {errorMessage(extractPaper.error, "Could not analyze this file.")}{" "}
              You can still fill in the fields manually.
            </p>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="paper-title">Title</Label>
            <Input
              id="paper-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={fieldsDisabled}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
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

          <div className="flex flex-col gap-2">
            <Label htmlFor="paper-authors">Authors</Label>
            <Input
              id="paper-authors"
              placeholder="Separate names with commas"
              value={authors}
              onChange={(e) => setAuthors(e.target.value)}
              disabled={fieldsDisabled}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="paper-category">Category</Label>
            <Input
              id="paper-category"
              placeholder="e.g. Machine Learning"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={fieldsDisabled}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="paper-keywords">Keywords</Label>
            <Input
              id="paper-keywords"
              placeholder="e.g. machine learning, healthcare"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              disabled={fieldsDisabled}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="paper-problem">Research problem</Label>
            <Textarea
              id="paper-problem"
              rows={3}
              value={researchProblem}
              onChange={(e) => setResearchProblem(e.target.value)}
              disabled={fieldsDisabled}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="paper-method">Methodology</Label>
            <Textarea
              id="paper-method"
              rows={3}
              value={methodology}
              onChange={(e) => setMethodology(e.target.value)}
              disabled={fieldsDisabled}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="paper-conclusion">Conclusion</Label>
            <Textarea
              id="paper-conclusion"
              rows={3}
              value={conclusion}
              onChange={(e) => setConclusion(e.target.value)}
              disabled={fieldsDisabled}
            />
          </div>

          {/* Published Month & Year Picker */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="paper-date">Published date</Label>
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="paper-date"
                  type="button"
                  variant="outline"
                  disabled={fieldsDisabled}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !publishedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {parsedDate
                    ? format(parsedDate, "MMMM yyyy")
                    : "Pick month and year"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  captionLayout="dropdown"
                  startMonth={new Date(1970, 0)}
                  endMonth={new Date(2035, 11)}
                  month={parsedDate}
                  onMonthChange={(month) => {
                    setPublishedDate(format(month, "yyyy-MM-01"));
                    setDatePickerOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          {submitError && (
            <p className="text-sm text-destructive">{submitError}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {uploading ? "Uploading…" : "Add paper"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}