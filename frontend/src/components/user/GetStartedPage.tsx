import { useState } from "react";
import { FolderPlus } from "lucide-react";
import CreateProjectDialog from "@/components/user/CreateProjectDialog";
import { JoinProjectDialog } from "@/components/user/JoinProjectDialog";
import { Button } from "@/components/ui/button";
import { useOnboardingTour } from "@/hooks/useOnboardingTour";
import { useCurrentUser } from "@/hooks/useAuth";
import { ROLES } from "@/constants/roles";
import { GuidesDialog } from "@/components/user/GuidesDialog";

export default function GetStarted() {
  const { data: user } = useCurrentUser();
  const { startTour } = useOnboardingTour();
  const [guidesOpen, setGuidesOpen] = useState(false);

  return (
    <div className="mx-auto w-full max-w-4xl p-6">
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-5 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <FolderPlus className="size-5" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Welcome to PSU-Collab
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Create a project to organize your capstone work and invite your team.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <CreateProjectDialog
            triggerLabel="Create project"
            triggerTourTarget="setup.create-project"
            primary
            triggerClassName="sm:min-w-40"
          />
          <JoinProjectDialog
            triggerLabel="Join with invite link"
            triggerTourTarget="setup.join-project"
          />
          {user?.role?.toLowerCase() === ROLES.STUDENT && (
            <Button
              type="button"
              variant="outline"
              title="Open guides and tutorials"
              onClick={() => setGuidesOpen(true)}
            >
              Guides &amp; tutorials
            </Button>
          )}
        </div>
      </section>
      <GuidesDialog
        open={guidesOpen}
        onOpenChange={setGuidesOpen}
        onReplayOnboarding={() => {
          if (user?.id) startTour(user.id, "student-no-project");
        }}
      />
    </div>
  );
}
