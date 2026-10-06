import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import AppLayout from "@/layouts/Applayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  BookOpen,
  TrendingUp,
  Users,
  LucideCalendarDays,
} from "lucide-react";
import { useSearchPapers } from "@/hooks/usePapers";
import { rememberLastVisitedCapstone } from "@/lib/lastVisitedCapstone";

const categories = [
  "All Categories",
  "Artificial Intelligence",
  "Deep Learning",
  "Blockchain",
  "Natural Language Processing",
  "Internet of Things",
  "Computer Vision",
  "Data Science",
  "Augmented Reality",
  "Cyber Security",
];

const examples = [
  "machine learning for disease prediction",
  "AI in healthcare",
  "blockchain supply chain",
  "computer vision autonomous",
  "sentiment analysis social media",
];

const DEFAULT_CATEGORY = "All Categories";

// Custom hook for debouncing input changes
function useDebouncedValue<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

// ---------------------------------------------------------------------------
// Results Skeleton Only (Preserves search input focus during initial load)
// ---------------------------------------------------------------------------

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
            <Skeleton
              className={`h-5 ${item % 2 === 0 ? "w-3/4" : "w-2/3"}`}
            />
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

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function CapstoneSearch() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlQuery = searchParams.get("query") ?? "";
  const rawCategory = searchParams.get("category");

  const activeCategory = categories.includes(rawCategory ?? "")
    ? (rawCategory as string)
    : DEFAULT_CATEGORY;

  // Local state for immediate input feedback; URL + Query hook consume debounced input
  const [input, setInput] = useState(urlQuery);
  const debouncedInput = useDebouncedValue(input);
  const trimmedQuery = debouncedInput.trim();

  // TanStack Query integration
  const {
    data: searchResults = [],
    isLoading,
    error,
  } = useSearchPapers({
    query: trimmedQuery,
    limit: 20,
  });

  // Remember last visited route
  useEffect(() => {
    rememberLastVisitedCapstone(location.pathname + location.search);
  }, [location.pathname, location.search]);

  // Sync debounced input -> URL params with replace: true to prevent history stack buildup
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

  const handleCategoryChange = (value: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === DEFAULT_CATEGORY) {
          next.delete("category");
        } else {
          next.set("category", value);
        }
        return next;
      },
      { replace: true }
    );
  };

  // Prevent keepPreviousData from displaying stale results when user clears the input
  const visibleResults = trimmedQuery ? searchResults : [];

  return (
    <AppLayout
      breadcrumbs={[{ label: "Capstone Search", href: "/capstone-search" }]}
    >
      <div className="flex flex-col gap-5">
        {/* Header */}
        <div className="flex flex-col gap-0">
          <h1 className="my-2 flex items-center text-2xl font-semibold dark:text-foreground">
            ✦ Capstone Semantic Search
          </h1>
          <p className="text-sm text-muted-foreground">
            Intelligent, meaning-based searching of capstone project titles
            using semantic similarity
          </p>
        </div>

        {/* Search Input Container */}
        <div className="sticky top-12 z-10 bg-background/95 py-3 backdrop-blur supports-backdrop-filter:bg-background/80">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Enter search query eg.( 'machine learning for disease prediction' )"
              className="pl-9"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </div>
        </div>

        {/* Example Suggestions */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Try these examples
          </span>
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

        {/* Category Filters */}
        <div className="flex flex-col gap-2">
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            ◇ Filter by Category:
          </span>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <Button
                key={cat}
                size="sm"
                variant={activeCategory === cat ? "default" : "outline"}
                onClick={() => handleCategoryChange(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>

        {/* Results Counter */}
        {trimmedQuery && !isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span>{visibleResults.length} Results found</span>
          </div>
        )}

        {/* Dynamic Content: Skeletons vs Query Results */}
        {isLoading ? (
          <ResultsSkeleton />
        ) : (
          <div className="flex flex-col gap-3">
            {visibleResults.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                {error ? (
                  <p>Error: {error.message}</p>
                ) : !trimmedQuery ? (
                  <p>Enter a search query to find capstone projects</p>
                ) : (
                  <p>No results found for your search.</p>
                )}
              </div>
            ) : (
              visibleResults.map((result) => (
                <button
                  key={result.paper_id}
                  type="button"
                  onClick={() =>
                    navigate(`/capstone-view/${result.paper_id}`)
                  }
                  className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <div className="flex items-start gap-2">
                    <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                    <h3 className="font-semibold text-foreground dark:text-card-foreground">
                      {result.title}
                    </h3>
                  </div>
                  <p className="pl-7 text-sm text-muted-foreground">
                    {result.matching_snippet}
                  </p>
                  <div className="flex items-center gap-4 pl-7 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <LucideCalendarDays className="h-3 w-3" />
                      {result.published_date?.split("-")[0] ?? "N/A"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {result.authors?.join(", ") || "N/A"}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}