import {
  BookOpen,
  Clapperboard,
  Play,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface GuidesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReplayOnboarding: () => void;
}

export function GuidesDialog({
  open,
  onOpenChange,
  onReplayOnboarding,
}: GuidesDialogProps) {
  function replayOnboarding() {
    onOpenChange(false);
    onReplayOnboarding();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden bg-popover p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-6 py-6 pr-12">
          <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BookOpen className="size-5" aria-hidden="true" />
          </div>
          <DialogTitle className="text-xl">Guides &amp; tutorials</DialogTitle>
          <DialogDescription>
            Find a quick walkthrough or explore video guides to help you get
            the most out of PSU-Collab.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto p-6">
          <section aria-labelledby="interactive-guides-heading">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles
                className="size-4 text-primary"
                aria-hidden="true"
              />
              <h2
                id="interactive-guides-heading"
                className="text-sm font-semibold text-foreground"
              >
                Interactive guide
              </h2>
            </div>
            <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-medium text-card-foreground">
                  Take a tour of your workspace
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Follow a short, step-by-step tour of the tools available to
                  you.
                </p>
              </div>
              <Button
                type="button"
                onClick={replayOnboarding}
                className="shrink-0"
              >
                <Play className="size-4" aria-hidden="true" />
                Start tour
              </Button>
            </div>
          </section>

          <section aria-labelledby="video-guides-heading">
            <div className="mb-3 flex items-center gap-2">
              <Clapperboard
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <h2
                id="video-guides-heading"
                className="text-sm font-semibold text-foreground"
              >
                Video guides
              </h2>
              <Badge variant="secondary">Coming soon</Badge>
            </div>
            <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-muted/30 px-5 py-7 text-center">
              <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-background text-muted-foreground shadow-sm">
                <Play className="size-5" aria-hidden="true" />
              </div>
              <p className="font-medium text-foreground">
                Video walkthroughs are on the way
              </p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                We&apos;re putting together visual guides to help you with
                projects, tasks, and team collaboration.
              </p>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
