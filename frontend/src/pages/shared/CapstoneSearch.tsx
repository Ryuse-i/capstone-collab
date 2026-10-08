import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AppLayout from "@/layouts/Applayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  BookOpen,
  TrendingUp,
  Clock,
  Users,
  LucideCalendarDays,
  Plus,
  Sparkles,
} from "lucide-react";
import { useGetLatestPapers, useSearchPapers } from "@/hooks/usePapers";
import { useCurrentUser } from "@/hooks/useAuth";
import { ROLES } from "@/constants/roles";
import UploadPaperDialog from "@/components/user/UploadPaperDialog";
import type { SentenceMatch } from "@/types/capstoneresults";

const SNIPPET_CHARS = 300;

const examples = [
  "machine learning for disease prediction",
  "AI in healthcare",
  "blockchain supply chain",
  "computer vision autonomous",
  "sentiment analysis social media",
];

// Utility to bold/highlight search query terms inside passage text
function highlightQueryTerms(text: string, query: string) {
  if (!query.trim()) return text;

  const words = query
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  if (words.length === 0) return text;

  const regex = new RegExp(`(${words.join("|")})`, "gi");
  const parts = text.split(regex);

  return parts.map((part, idx) =>
    regex.test(part) ? (
      <mark
        key={idx}
        className="rounded bg-yellow-200/80 px-0.5 font-medium text-foreground dark:bg-yellow-800/60 dark:text-yellow-100"
      >
        {part}
      </mark>
    ) : (
      part
    )
  );
}

// Badge for passage score strength
function MatchStrengthBadge({ score }: { score: number }) {
  const percentage = Math.round(score * 100);

  if (score >= 0.5) {
    return (
      <Badge variant="default" className="bg-emerald-600 text-xs text-white hover:bg-emerald-700">
        Strong match • {percentage}%
      </Badge>
    );
  }
  if (score >= 0.25) {
    return (
      <Badge variant="secondary" className="text-xs">
        Relevant snippet • {percentage}%
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-xs text-muted-foreground">
      Match • {percentage}%
    </Badge>
  );
}

// Custom hook for debouncing input changes
function useDebouncedValue<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function ResultsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[1, 2, 3, 4, 5].map((item) => (
        <div
          key={item}
          className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
        >
          <div className="flex items-start gap-2">
            <Skeleton className="mt-0.5 h-5 w-5 shrink-0 rounded-sm" />
            <Skeleton className={`h-5 ${item % 2 === 0 ? "w-3/4" : "w-2/3"}`} />
          </div>
          <div className="flex flex-col gap-2 pl-7">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
          <div className="flex items-center gap-4 pl-7">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface PaperCardData {
  id: number;
  title: string;
  snippet: string;
  publishedDate: string | null;
  authors: string[];
  score?: number;
  matches?: SentenceMatch[];
}

function PaperCard({
  paper,
  query,
  onClick,
}: {
  paper: PaperCardData;
  query: string;
  onClick: () => void;
}) {
  const isSearchMatch = Boolean(query && paper.score !== undefined);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {/* Title & Top Metadata */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <h3 className="font-semibold text-foreground dark:text-card-foreground">
            {paper.title}
          </h3>
        </div>
        {isSearchMatch && paper.score !== undefined && (
          <Badge variant="outline" className="shrink-0 text-xs">
            {Math.round(paper.score * 100)}% Overall Score
          </Badge>
        )}
      </div>

      {/* Date & Authors */}
      <div className="flex items-center gap-4 pl-7 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <LucideCalendarDays className="h-3 w-3" />
          {paper.publishedDate?.split("-")[0] ?? "N/A"}
        </span>
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {paper.authors?.join(", ") || "N/A"}
        </span>
      </div>

      {/* Primary Passage / Snippet Block */}
      {isSearchMatch ? (
        <div className="ml-7 flex flex-col gap-2 rounded-md border-l-2 border-primary/70 bg-muted/40 p-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Matching Passage
            </span>
            {paper.matches?.[0] && (
              <MatchStrengthBadge score={paper.matches[0].score} />
            )}
          </div>

          <p className="text-sm leading-relaxed text-foreground">
            "{highlightQueryTerms(paper.snippet, query)}"
          </p>

          {/* Additional Sentence Matches (if returned) */}
          {paper.matches && paper.matches.length > 1 && (
            <div className="mt-2 flex flex-col gap-1.5 border-t border-border/60 pt-2">
              {paper.matches.slice(1).map((match, idx) => (
                <div key={idx} className="flex items-start justify-between gap-2 text-xs">
                  <p className="text-muted-foreground">
                    • "{highlightQueryTerms(match.text, query)}"
                  </p>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                    {Math.round(match.score * 100)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Standard Fallback Abstract Snippet (Latest Papers) */
        <p className="pl-7 text-sm text-muted-foreground">{paper.snippet}</p>
      )}
    </button>
  );
}

export default function CapstoneSearch() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Role check using current user data
  const { data: user } = useCurrentUser();
  const isAdmin = user?.role?.toLowerCase() === ROLES.ADMIN;

  const urlQuery = searchParams.get("query") ?? "";
  const [input, setInput] = useState(urlQuery);
  const debouncedInput = useDebouncedValue(input);
  const trimmedQuery = debouncedInput.trim();
  const isSearching = trimmedQuery !== "";

  const [uploadOpen, setUploadOpen] = useState(false);

  const {
    data: searchResults = [],
    isLoading: searchLoading,
    error: searchError,
  } = useSearchPapers({ query: trimmedQuery, limit: 20 });

  const {
    data: latestPapers = [],
    isLoading: latestLoading,
    error: latestError,
  } = useGetLatestPapers(10);

  // Sync debounced input -> URL; replace so history doesn't pile up
  useEffect(() => {
    setSearchParams(
      (prev) => {
        if ((prev.get("query") ?? "") === debouncedInput) return prev;
        const next = new URLSearchParams(prev);
        if (debouncedInput) next.set("query", debouncedInput);
        else next.delete("query");
        return next;
      },
      { replace: true }
    );
  }, [debouncedInput, setSearchParams]);

  const papers: PaperCardData[] = isSearching
    ? searchResults.map((r) => ({
        id: r.paper_id,
        title: r.title,
        snippet: r.matching_snippet,
        publishedDate: r.published_date ?? null,
        authors: r.authors ?? [],
        score: r.score,
        matches: r.matches,
      }))
    : latestPapers.map((p) => ({
        id: p.id,
        title: p.title,
        snippet: (p.abstract ?? "").slice(0, SNIPPET_CHARS),
        publishedDate: p.published_date ?? null,
        authors: p.authors ?? [],
      }));

  const isLoading = isSearching ? searchLoading : latestLoading;
  const error = isSearching ? searchError : latestError;

  return (
    <AppLayout
      breadcrumbs={[
        { label: "Research Repository", href: "/capstone-repository" },
      ]}
    >
      <div className="flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-0">
            <h1 className="my-2 text-2xl font-semibold dark:text-foreground">
              Research Repository
            </h1>
            <p className="text-sm text-muted-foreground">
              {isAdmin
                ? "Search existing capstone papers or add new ones to the repository."
                : "Search existing capstone papers in the repository."}
            </p>
          </div>

          {/* Render "Add paper" button only for ADMIN users */}
          {isAdmin && (
            <Button className="mt-2 shrink-0" onClick={() => setUploadOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add paper
            </Button>
          )}
        </div>

        {/* Search input */}
        <div className="sticky top-12 z-10 bg-background/95 py-3 backdrop-blur supports-backdrop-filter:bg-background/80">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by meaning, e.g. 'machine learning for disease prediction'"
              className="pl-9"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </div>
        </div>

        {/* Example suggestions */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Try these examples</span>
          {examples.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setInput(ex)}
              className="text-xs text-primary underline-offset-4 hover:underline"
            >
              {ex}
            </button>
          ))}
        </div>

        {/* Section label */}
        {!isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isSearching ? (
              <>
                <TrendingUp className="h-4 w-4" />
                <span>{papers.length} results found</span>
              </>
            ) : (
              <>
                <Clock className="h-4 w-4" />
                <span>Latest papers</span>
              </>
            )}
          </div>
        )}

        {isLoading ? (
          <ResultsSkeleton />
        ) : (
          <div className="flex flex-col gap-3">
            {papers.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                {error ? (
                  <p>Error: {error.message}</p>
                ) : isSearching ? (
                  <p>No results found for your search.</p>
                ) : (
                  <p>No papers yet.</p>
                )}
              </div>
            ) : (
              papers.map((paper) => (
                <PaperCard
                  key={paper.id}
                  paper={paper}
                  query={trimmedQuery}
                  onClick={() => navigate(`/capstone-view/${paper.id}`)}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Render Upload modal conditionally for ADMINs only */}
      {isAdmin && (
        <UploadPaperDialog open={uploadOpen} onOpenChange={setUploadOpen} />
      )}
    </AppLayout>
  );
}