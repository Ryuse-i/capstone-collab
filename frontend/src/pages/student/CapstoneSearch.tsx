import { useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import AppLayout from "@/layouts/Applayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export default function CapstoneSearch() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const query = searchParams.get("query") ?? "";
  const rawCategory = searchParams.get("category");
  const activeCategory = categories.includes(rawCategory ?? "")
    ? (rawCategory as string)
    : DEFAULT_CATEGORY;

  // Remember this exact path (incl. query/category) so the sidebar's
  // "Capstone Search" item can return here after visiting other pages.
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
  const handleCategoryChange = (value: string) => updateParam("category", value);

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

  return (
    <AppLayout
      breadcrumbs={[{ label: "Capstone Search", href: "/capstone-search" }]}
    >
      {/* Header */}
      <div className="gap-0 flex flex-col">
        <h1 className="text-2xl font-semibold flex items-center dark:text-foreground mb-2">
          ✦ Capstone Semantic Search
        </h1>
        <p className="text-sm text-muted-foreground">
          Intelligent, meaning-based searching of capstone project titles using
          semantic similarity
        </p>
      </div>

      {/* Search input - sticky, stays within content area */}
      <div className="sticky top-12 z-10 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80 py-3">
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
        <span className="text-sm text-muted-foreground flex items-center gap-1">
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
          <div className="text-center text-muted-foreground py-12">
            No results found for your search.
          </div>
        ) : (
          filteredResults.map((result) => (
            <button
              key={result.id}
              type="button"
              onClick={() => navigate(`/capstone-view/${result.id}`)}
              className="text-left bg-card border border-border rounded-lg p-4 flex flex-col gap-2 transition-colors hover:border-primary/50 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <div className="flex items-start gap-2">
                <BookOpen className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <h3 className="font-semibold text-gray-900 dark:text-card-foreground">
                  {result.title}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground pl-7">
                {result.description}
              </p>
              <div className="flex flex-wrap gap-2 pl-7">
                {result.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-4 pl-7 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <LucideCalendarDays className="h-3 w-3" /> {result.year}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" /> {result.authors}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </AppLayout>
  );
}