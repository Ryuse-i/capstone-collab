import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/layouts/Applayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  BookOpen,
  Users,
  LucideCalendarDays,
  Sparkles,
  Layers,
  ListChecks,
} from "lucide-react";
import { results } from "@/types/capstoneresults";
import { rememberLastVisitedCapstone } from "@/lib/lastVisitedCapstone";
import { AlertTriangle } from "lucide-react";

export default function CapstoneView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    // Simulate loading delay for consistency with other pages
    const timer = setTimeout(() => {
      try {
        const foundResult = results.find((r) => r.id === id);
        if (foundResult) {
          setResult(foundResult);
          setLoading(false);
        } else {
          setError("Capstone project not found");
          setLoading(false);
        }
      } catch (err) {
        setError("Failed to load capstone data. Please try again.");
        setLoading(false);
      }
    }, 300); // 300ms delay to show loading state

    // Remember this project's view page so the sidebar's "Capstone Search"
    // item returns here after visiting other pages, instead of resetting
    // to the search list.
    if (id) {
      rememberLastVisitedCapstone(`/capstone-view/${id}`);
    }

    return () => clearTimeout(timer);
  }, [id]);

  if (error) {
    return (
      <AppLayout
        breadcrumbs={[
          { label: "Capstone Search", href: "/capstone-search" },
          { label: "Error", href: "#" },
        ]}
      >
        <div className="min-h-screen flex items-center justify-center bg-background dark:bg-muted">
          <div className="text-center">
            <div className="rounded-full h-12 w-12 border-b-2 border-destructive mb-4">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <p className="text-foreground dark:text-muted-foreground">
              {error}
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (loading) {
    return (
      <AppLayout
        breadcrumbs={[
          { label: "Capstone Search", href: "/capstone-search" },
          { label: "Loading", href: "#" },
        ]}
      >
        <div className="min-h-screen flex items-center justify-center bg-background dark:bg-muted">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
            <p className="text-foreground dark:text-muted-foreground">
              Loading capstone data...
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!result) {
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
          <Button variant="outline" onClick={() => navigate("/capstone-search")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
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
        { label: result.title, href: `/capstone-view/${result.id}` },
      ]}
    >
      <div className="flex flex-col gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/capstone-search")}
          className="-ml-2 w-fit"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Search
        </Button>

        {/* Title & meta card */}
        <div className="bg-card border border-border rounded-lg p-6 flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <BookOpen className="h-6 w-6 text-muted-foreground mt-1 shrink-0" />
            <h1 className="text-xl font-semibold text-gray-900 dark:text-card-foreground leading-snug">
              {result.title}
            </h1>
          </div>

          <p className="text-sm text-muted-foreground pl-9">
            {result.description}
          </p>

          <div className="flex flex-wrap gap-2 pl-9">
            {result.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>

          <div className="flex flex-col gap-2 pl-9 pt-4 border-t border-border text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <LucideCalendarDays className="h-4 w-4" />
              Year: <span className="text-foreground">{result.year}</span>
            </span>
            <span className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              Authors: <span className="text-foreground">{result.authors}</span>
            </span>
          </div>
        </div>

        {/* Abstract */}
        <div className="bg-card border border-border rounded-lg p-6 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-gray-900 dark:text-card-foreground">
              Abstract
            </h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {result.abstract}
          </p>
        </div>

        {/* Tech Stack */}
        <div className="bg-card border border-border rounded-lg p-6 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-gray-900 dark:text-card-foreground">
              Tech Stack
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {result.techStack.map((tech) => (
              <Badge key={tech} variant="secondary" className="text-xs">
                {tech}
              </Badge>
            ))}
          </div>
        </div>

        {/* Key Features */}
        <div className="bg-card border border-border rounded-lg p-6 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-gray-900 dark:text-card-foreground">
              Key Features
            </h2>
          </div>
          <ul className="flex flex-col gap-2">
            {result.keyFeatures.map((feature, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AppLayout>
  );
}