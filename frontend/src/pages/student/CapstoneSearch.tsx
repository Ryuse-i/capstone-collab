import { useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import AppLayout from "@/layouts/Applayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  BookOpen,
  TrendingUp,
  Users,
  LucideCalendarDays,
} from "lucide-react";
import { results } from "@/types/capstoneresults";
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

// ---------------------------------------------------------------------------
// Capstone Search Skeleton
// ---------------------------------------------------------------------------

function CapstoneSearchSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <Skeleton className="my-2 h-8 w-72" />
        <Skeleton className="h-4 w-155 max-w-full" />
      </div>

      {/* ── Search Input ───────────────────────────────────────────── */}
      <div className="sticky top-12 z-10 bg-background/95 py-3 backdrop-blur supports-backdrop-filter:bg-background/80">
        <Skeleton className="h-10 w-full rounded-md" />
      </div>

      {/* ── Example Queries ───────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-4 w-28 shrink-0" />

        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-4 w-48" />
      </div>

      {/* ── Category Filter ───────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-36" />

        <div className="flex flex-wrap gap-2">
          {[
            "w-28",
            "w-40",
            "w-28",
            "w-24",
            "w-48",
            "w-36",
            "w-36",
            "w-28",
            "w-40",
            "w-32",
          ].map((width, index) => (
            <Skeleton
              key={index}
              className={`h-9 rounded-md ${width}`}
            />
          ))}
        </div>
      </div>

      {/* ── Results Count ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 w-28" />
      </div>

      {/* ── Results ───────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        {[1, 2, 3, 4, 5].map((item) => (
          <div
            key={item}
            className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
          >
            {/* Title */}
            <div className="flex items-start gap-2">
              <Skeleton className="mt-0.5 h-5 w-5 shrink-0 rounded-sm" />
              <Skeleton
                className={`h-5 ${
                  item % 2 === 0 ? "w-3/4" : "w-2/3"
                }`}
              />
            </div>

            {/* Description */}
            <div className="flex flex-col gap-2 pl-7">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 pl-7">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-5 w-32 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>

            {/* Metadata */}
            <div className="flex items-center gap-4 pl-7">
              <div className="flex items-center gap-1">
                <Skeleton className="h-3 w-3 rounded-full" />
                <Skeleton className="h-3 w-12" />
              </div>

              <div className="flex items-center gap-1">
                <Skeleton className="h-3 w-3 rounded-full" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CapstoneSearch() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const query = searchParams.get("query") ?? "";
  const rawCategory = searchParams.get("category");

  const activeCategory = categories.includes(rawCategory ?? "")
    ? (rawCategory as string)
    : DEFAULT_CATEGORY;

  useEffect(() => {
    rememberLastVisitedCapstone(location.pathname + location.search);
  }, [location.pathname, location.search]);

  const updateParam = (key: string, value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);

      if (!value || value === DEFAULT_CATEGORY) {
        next.delete(key);
      } else {
        next.set(key, value);
      }

      return next;
    });
  };

  const handleQueryChange = (value: string) => updateParam("query", value);

  const handleCategoryChange = (value: string) =>
    updateParam("category", value);

  const filteredResults = results.filter((r) => {
    const matchesQuery =
      query === "" ||
      r.title.toLowerCase().includes(query.toLowerCase()) ||
      r.description.toLowerCase().includes(query.toLowerCase()) ||
      r.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()));

    const matchesCategory =
      activeCategory === DEFAULT_CATEGORY ||
      r.tags.some((t) => t === activeCategory);

    return matchesQuery && matchesCategory;
  });

  // Replace this with the actual API/search loading state later.
  const isLoading = false;

  return (
    <AppLayout
      breadcrumbs={[{ label: "Capstone Search", href: "/capstone-search" }]}
    >
      {isLoading ? (
        <CapstoneSearchSkeleton />
      ) : (
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

          {/* Search input */}
          <div className="sticky top-12 z-10 bg-background/95 py-3 backdrop-blur supports-backdrop-filter:bg-background/80">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />

              <Input
                placeholder="Enter search query eg.( 'machine learning for disease prediction' )"
                className="pl-9"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
              />
            </div>
          </div>

          {/* Example queries */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Try these examples
            </span>

            {examples.map((ex) => (
              <button
                key={ex}
                onClick={() => handleQueryChange(ex)}
                className="text-xs text-primary underline-offset-4 hover:underline"
              >
                {ex}
              </button>
            ))}
          </div>

          {/* Category filter */}
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

          {/* Results count */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span>{filteredResults.length} Results found</span>
          </div>

          {/* Results */}
          <div className="flex flex-col gap-3">
            {filteredResults.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                No results found for your search.
              </div>
            ) : (
              filteredResults.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  onClick={() =>
                    navigate(`/capstone-view/${result.id}`)
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
                    {result.description}
                  </p>

                  <div className="flex flex-wrap gap-2 pl-7">
                    {result.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="text-xs"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center gap-4 pl-7 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <LucideCalendarDays className="h-3 w-3" />
                      {result.year}
                    </span>

                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {result.authors}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}