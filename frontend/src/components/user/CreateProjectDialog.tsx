import { useState } from "react";
import { useCreateProject } from "@/hooks/useProject"; // Adjust path to your react-query file
import { useCurrentUser } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Stepper,
  StepperContent,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperPanel,
  StepperSeparator,
  StepperTrigger,
} from "@/components/reui/stepper";
import { ChevronRight, Loader2 } from "lucide-react";

export function CreateProjectDialog({
  onProjectCreated,
}: {
  onProjectCreated?: () => void;
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [open, setOpen] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Target dynamic hook operations
  const { data: user } = useCurrentUser();
  const createProjectMutation = useCreateProject();

  // Core Project Fields (Step 1)
  const [projName, setProjName] = useState("");
  const [projDesc, setProjDesc] = useState("");
  const [advisor, setAdvisor] = useState("");
  const [instructor, setInstructor] = useState("");
  const [step1Error, setStep1Error] = useState("");

  // Invitation Fields (Step 2)
  const [invEmail, setInvEmail] = useState("");
  const [invRole, setInvRole] = useState("");

  // Task Fields (Step 3)
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState("");

  const steps = [1, 2, 3];

  const resetForm = () => {
    setCurrentStep(1);
    setProjName("");
    setProjDesc("");
    setAdvisor("");
    setInstructor("");
    setStep1Error("");
    setSubmitError("");
    setInvEmail("");
    setInvRole("");
    setTaskTitle("");
    setTaskDue("");
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!projName.trim()) {
        setStep1Error("Project name is required.");
        return;
      }
      if (!projDesc.trim()) {
        setStep1Error("Description is required.");
        return;
      }
    }
    setStep1Error("");
    if (currentStep < 3) setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((prev) => prev - 1);
  };

  // Dispatches transactional data payload directly to the hook configuration
  const executeSubmit = (includeTasks: boolean) => {
    setSubmitError("");

    if (!user?.id) {
      setSubmitError(
        "Authentication error: No current active session identifier discovered.",
      );
      return;
    }

    // Prepare complete ProjectCreate structure requested by back-end schema
    const payload = {
      name: projName.trim(),
      description: projDesc.trim(),
      created_by: user.id,
      advisor: advisor.trim() === "" ? null : advisor.trim(),
      instructor: instructor.trim() === "" ? null : instructor.trim(),
    };

    createProjectMutation.mutate(payload, {
      onSuccess: () => {
        // Optional tracking logs for supplementary secondary entities
        if (includeTasks && taskTitle.trim()) {
          console.log("Mocking secondary task execution parameters...", {
            taskTitle,
            taskDue,
          });
        }
        if (invEmail.trim()) {
          console.log("Mocking team invitations pipeline sequence...", {
            invEmail,
            invRole,
          });
        }

        setOpen(false);
        resetForm();
        onProjectCreated?.();
      },
      onError: (err) => {
        setSubmitError(
          err.message ||
            "An exception occurred persisting your tracking scope configuration.",
        );
      },
    });
  };

  const handleSubmit = () => executeSubmit(true);
  const handleSkipAndFinish = () => executeSubmit(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (createProjectMutation.isPending) return; // Freeze closure interactions during network runtime profiles
        setOpen(isOpen);
        if (!isOpen) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <button
          className="text-sm font-semibold inline-flex items-center gap-1 hover:underline group"
          style={{ color: "#701D0B" }}
        >
          Create project{" "}
          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </DialogTrigger>

      <DialogContent
        className={cn(
          "max-w-5xl sm:max-w-2xl",
          "[&>[data-slot=dialog-close]]:bg-background [&>[data-slot=dialog-close]]:-end-6 [&>[data-slot=dialog-close]]:-top-6",
          "[&>[data-slot=dialog-close]]:size-7 [&>[data-slot=dialog-close]]:rounded-full [&>[data-slot=dialog-close]]:border [&>[data-slot=dialog-close]]:shadow-sm",
        )}
      >
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Set up your workspace parameters, build your team alignment, and
            outline initial tasks.
          </DialogDescription>
        </DialogHeader>

        {submitError && (
          <div className="p-3 text-xs font-medium rounded bg-destructive/10 text-destructive border border-destructive/20">
            {submitError}
          </div>
        )}

        <div className="space-y-6 mt-2">
          <Stepper
            value={currentStep}
            onValueChange={setCurrentStep}
            className="w-full space-y-6"
          >
            <StepperNav className="flex items-center w-full justify-between gap-2">
              {steps.map((step) => (
                <StepperItem
                  key={step}
                  step={step}
                  className="group/step flex flex-1 items-center last:flex-initial"
                >
                  <StepperTrigger
                    type="button"
                    className="flex items-center gap-2 text-left pointer-events-none"
                  >
                    <StepperIndicator className="data-[state=active]:bg-[#701D0B] data-[state=active]:text-white data-[state=completed]:bg-green-600 data-[state=completed]:text-white data-[state=inactive]:text-muted-foreground shrink-0">
                      {step}
                    </StepperIndicator>
                    <div className="hidden sm:block text-xs font-medium text-[var(--text-h)] whitespace-nowrap">
                      {step === 1 && "Project Details"}
                      {step === 2 && "Invite Members"}
                      {step === 3 && "Create Tasks"}
                    </div>
                  </StepperTrigger>
                  {steps.length > step && (
                    <StepperSeparator className="flex-1 mx-2 group-data-[state=completed]/step:bg-green-600" />
                  )}
                </StepperItem>
              ))}
            </StepperNav>

            <StepperPanel className="text-sm min-h-[140px] pt-2">
              <StepperContent value={1} className="space-y-4">
                <FieldGroup>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field className="sm:col-span-2">
                      <FieldLabel htmlFor="proj-name">
                        Project Name <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Input
                        id="proj-name"
                        placeholder="e.g., Q3 Expansion Strategy"
                        value={projName}
                        disabled={createProjectMutation.isPending}
                        onChange={(e) => {
                          setProjName(e.target.value);
                          setStep1Error("");
                        }}
                      />
                    </Field>

                    <Field className="sm:col-span-2">
                      <FieldLabel htmlFor="proj-desc">
                        Description <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Input
                        id="proj-desc"
                        placeholder="Brief details about your roadmap..."
                        value={projDesc}
                        disabled={createProjectMutation.isPending}
                        onChange={(e) => {
                          setProjDesc(e.target.value);
                          setStep1Error("");
                        }}
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="proj-advisor">
                        Advisor UUID
                      </FieldLabel>
                      <Input
                        id="proj-advisor"
                        placeholder="Optional UUID target string"
                        value={advisor}
                        disabled={createProjectMutation.isPending}
                        onChange={(e) => setAdvisor(e.target.value)}
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="proj-instructor">
                        Instructor UUID
                      </FieldLabel>
                      <Input
                        id="proj-instructor"
                        placeholder="Optional UUID target string"
                        value={instructor}
                        disabled={createProjectMutation.isPending}
                        onChange={(e) => setInstructor(e.target.value)}
                      />
                    </Field>
                  </div>

                  {step1Error && (
                    <p className="text-xs text-destructive mt-1 font-medium">
                      {step1Error}
                    </p>
                  )}
                </FieldGroup>
              </StepperContent>

              <StepperContent value={2} className="space-y-4">
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="inv-email">
                      Team Member Email
                    </FieldLabel>
                    <Input
                      id="inv-email"
                      type="email"
                      placeholder="colleague@workspace.com"
                      value={invEmail}
                      disabled={createProjectMutation.isPending}
                      onChange={(e) => setInvEmail(e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="inv-role">Workspace Role</FieldLabel>
                    <Input
                      id="inv-role"
                      placeholder="e.g., Administrator, Contributor, Editor"
                      value={invRole}
                      disabled={createProjectMutation.isPending}
                      onChange={(e) => setInvRole(e.target.value)}
                    />
                  </Field>
                </FieldGroup>
              </StepperContent>

              <StepperContent value={3} className="space-y-4">
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="task-title">
                      First Urgent Task
                    </FieldLabel>
                    <Input
                      id="task-title"
                      placeholder="e.g., Compile competitive audit"
                      value={taskTitle}
                      disabled={createProjectMutation.isPending}
                      onChange={(e) => setTaskTitle(e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="task-due">Due Date</FieldLabel>
                    <Input
                      id="task-due"
                      type="date"
                      value={taskDue}
                      disabled={createProjectMutation.isPending}
                      onChange={(e) => setTaskDue(e.target.value)}
                    />
                  </Field>
                </FieldGroup>
              </StepperContent>
            </StepperPanel>

            <DialogFooter className="flex sm:justify-between items-center border-t border-[var(--border)] pt-4 gap-2">
              <div className="w-full sm:w-auto flex justify-start">
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    disabled={createProjectMutation.isPending}
                  >
                    Back
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {currentStep === 1 && (
                  <DialogClose asChild>
                    <Button
                      variant="outline"
                      type="button"
                      disabled={createProjectMutation.isPending}
                    >
                      Cancel
                    </Button>
                  </DialogClose>
                )}

                {currentStep < 3 ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    className="bg-[#701D0B] text-white hover:bg-[#701D0B]/90 w-full sm:w-auto"
                  >
                    Next Step
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleSkipAndFinish}
                      disabled={createProjectMutation.isPending}
                      className="text-muted-foreground hover:text-[var(--text-h)]"
                    >
                      Skip Tasks
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSubmit}
                      disabled={createProjectMutation.isPending}
                      className="bg-[#701D0B] text-white hover:bg-[#701D0B]/90 min-w-[120px]"
                    >
                      {createProjectMutation.isPending ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Launching...
                        </span>
                      ) : (
                        "Finish & Launch"
                      )}
                    </Button>
                  </>
                )}
              </div>
            </DialogFooter>
          </Stepper>
        </div>
      </DialogContent>
    </Dialog>
  );
}
