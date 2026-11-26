import { ArrowLeft, Home, SearchX } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-6 py-12">
      <section className="w-full max-w-xl text-center">
        <div
          aria-hidden="true"
          className="relative mx-auto mb-8 flex size-28 items-center justify-center rounded-full bg-primary/5"
        >
          <div className="absolute inset-2 rounded-full border border-secondary/40" />
          <SearchX className="size-10 text-primary" strokeWidth={1.5} />
          <span className="absolute -right-1 top-2 size-3 rounded-full bg-secondary" />
        </div>

        <p className="mb-3 text-sm font-semibold tracking-[0.2em] text-primary uppercase">
          Error 404
        </p>
        <h1 className="mb-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          We can&apos;t find that page
        </h1>
        <p className="mx-auto max-w-md text-base leading-relaxed text-muted-foreground">
          The page may have moved, or the link might be incorrect. Let&apos;s get
          you back to PSU-Collab.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="h-10 gap-2 px-5">
            <Link to="/">
              <Home aria-hidden="true" />
              Back to home
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-10 gap-2 px-5">
            <Link to="/dashboard">
              <ArrowLeft aria-hidden="true" />
              Go to dashboard
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
