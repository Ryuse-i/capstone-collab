import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/layouts/Applayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  BookOpen,
  Users,
  LucideCalendarDays,
  Sparkles,
  Layers,
  ListChecks,
  AlertTriangle,
} from "lucide-react";
import { useGetOnePaper } from "@/hooks/usePapers";
import { rememberLastVisitedCapstone } from "@/lib/lastVisitedCapstone";

// ---------------------------------------------------------------------------
// Capstone View Skeleton
// ---------------------------------------------------------------------------

function CapstoneViewSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {/* ── Back Button ─────────────────────────────────────────────── */}
      <Skeleton className="h-8 w-28" />

      {/* ── Title & Meta Card ──────────────────────────────────────── */}
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
        <div className="flex items-start gap-3">
          <Skeleton className="mt-1 h-6 w-6 shrink-0 rounded-sm" />

          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-6 w-4/5" />
            <Skeleton className="h-6 w-2/5" />
          </div>
        </div>

        <div className="flex flex-col gap-2 pl-9">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>

        <div className="flex flex-wrap gap-2 pl-9">
          <Skeleton className="h-5 w-28 rounded-full" />
          <Skeleton className="h-5 w-36 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-5 w-32 rounded-full" />
        </div>

        <div className="flex flex-col gap-3 border-t border-border pl-9 pt-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-sm" />
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 w-16" />
          </div>

          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-sm" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>

      {/* ── Abstract ───────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-sm" />
          <Skeleton className="h-5 w-20" />
        </div>

        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>

      {/* ── Tech Stack ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-sm" />
          <Skeleton className="h-5 w-24" />
        </div>

        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-28 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-5 w-32 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-28 rounded-full" />
        </div>
      </div>

      {/* ── Key Features ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-sm" />
          <Skeleton className="h-5 w-28" />
        </div>

        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="flex items-start gap-2">
              <Skeleton className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" />
              <Skeleton
                className={`h-4 ${
                  item % 2 === 0 ? "w-4/5" : "w-11/12"
                }`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CapstoneView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const paperId = id ? parseInt(id, 10) : 0;

  // TanStack Query hook replacing manual effect + reloading logic
  const { data: paper, isLoading, error } = useGetOnePaper(paperId);

  useEffect(() => {
    if (paperId) {
      rememberLastVisitedCapstone(`/capstone-view/${paperId}`);
    }
  }, [paperId]);

  if (error) {
    return (
      <AppLayout
        breadcrumbs={[
          { label: "Capstone Search", href: "/capstone-search" },
          { label: "Error", href: "#" },
        ]}
      >
        <div className="flex min-h-screen items-center justify-center bg-background dark:bg-muted">
          <div className="text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border-b-2 border-destructive">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>

            <p className="text-foreground dark:text-muted-foreground">
              {error.message}
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (isLoading) {
    return (
      <AppLayout
        breadcrumbs={[
          { label: "Capstone Search", href: "/capstone-search" },
          { label: "Loading", href: "#" },
        ]}
      >
        <CapstoneViewSkeleton />
      </AppLayout>
    );
  }

  if (!paper) {
    return (
      <AppLayout
        breadcrumbs={[
          { label: "Capstone Search", href: "/capstone-search" },
          { label: "Not Found", href: "#" },
        ]}
      >
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <p className="text-muted-foreground">
            We couldn't find that capstone project.
          </p>

          <Button
            variant="outline"
            onClick={() => navigate("/capstone-search")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Search
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      breadcrumbs={[
        { label: "Capstone Search", href: "/capstone-search" },
        { label: paper.title, href: `/capstone-view/${paper.id}` },
      ]}
    >
      <div className="flex flex-col gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/capstone-search")}
          className="-ml-2 w-fit"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Search
        </Button>

        {/* Title & meta card */}
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
          <div className="flex items-start gap-3">
            <BookOpen className="mt-1 h-6 w-6 shrink-0 text-muted-foreground" />

            <h1 className="text-xl font-semibold leading-snug text-gray-900 dark:text-card-foreground">
              {paper.title}
            </h1>
          </div>

          <p className="pl-9 text-sm text-muted-foreground">
            {paper.abstract}
          </p>

          <div className="flex flex-wrap gap-2 pl-9">
            {paper.keywords?.map((tag: string) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>

          <div className="flex flex-col gap-2 border-t border-border pl-9 pt-4 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <LucideCalendarDays className="h-4 w-4" />
              Year:{" "}
              <span className="text-foreground">
                {paper.published_date
                  ? paper.published_date.split("-")[0]
                  : "N/A"}
              </span>
            </span>

            <span className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              Authors:{" "}
              <span className="text-foreground">
                {paper.authors?.join(", ") || "N/A"}
              </span>
            </span>
          </div>
        </div>

        {/* Abstract */}
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-muted-foreground" />

            <h2 className="font-semibold text-gray-900 dark:text-card-foreground">
              Abstract
            </h2>
          </div>

          <p className="text-sm leading-relaxed text-muted-foreground">
            {paper.abstract}
          </p>
        </div>

        {/* Additional fields reserved for future backend updates */}
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-gray-900 dark:text-card-foreground">
              Tech Stack
            </h2>
          </div>
          <p className="pl-4 text-sm text-muted-foreground">
            Tech stack information would be displayed here once added to the
            Paper model.
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-gray-900 dark:text-card-foreground">
              Key Features
            </h2>
          </div>
          <p className="pl-4 text-sm text-muted-foreground">
            Key features information would be displayed here once added to the
            Paper model.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}