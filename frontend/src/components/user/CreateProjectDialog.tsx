import { useState } from "react";
import { useCreateProject } from "@/hooks/useProject";
import { useCurrentUser } from "@/hooks/useAuth";
import { useCreateInvitation } from "@/hooks/useProjectInvite";
import { useCreateTask } from "@/hooks/useTask";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { ProjectInvitationCreate } from "@/hooks/useProjectInvite";
import { ChevronRight, Loader2, Plus, X, UserPlus } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MemberInvite {
  email: string;
  role: string;
}

const PRIORITY_OPTIONS = ["low", "medium", "high", "critical"];
const COMPLEXITY_OPTIONS = [
  "trivial",
  "simple",
  "moderate",
  "complex",
  "very_complex",
];
const CATEGORY_OPTIONS = [
  "feature",
  "bug",
  "research",
  "documentation",
  "design",
  "devops",
  "testing",
];

// ─── Component ────────────────────────────────────────────────────────────────

export function CreateProjectDialog({
  onProjectCreated,
}: {
  onProjectCreated?: () => void;
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [open, setOpen] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const { data: user } = useCurrentUser();
  const createProjectMutation = useCreateProject();
  const { createManyInvitations } = useCreateInvitation();
  const createTaskMutation = useCreateTask();

  // ── Step 1: Project Details ──
  const [projName, setProjName] = useState("");
  const [projDesc, setProjDesc] = useState("");
  const [step1Error, setStep1Error] = useState("");

  // ── Step 2: Members ──
  const [advisorAdded, setAdvisorAdded] = useState(false);
  const [advisorEmail, setAdvisorEmail] = useState("");

  const [instructorAdded, setInstructorAdded] = useState(false);
  const [instructorEmail, setInstructorEmail] = useState("");

  const [members, setMembers] = useState<MemberInvite[]>([]);
  const [memberEmailInput, setMemberEmailInput] = useState("");
  const [memberRoleInput, setMemberRoleInput] = useState("member");

  // ── Step 3: First Task (optional) ──
  const [taskName, setTaskName] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskStatus] = useState("todo");
  const [taskPriority, setTaskPriority] = useState("medium");
  const [taskComplexity, setTaskComplexity] = useState("moderate");
  const [taskComplexityPoints, setTaskComplexityPoints] = useState("1");
  const [taskCategory, setTaskCategory] = useState("feature");
  const [taskDeadline, setTaskDeadline] = useState("");

  const steps = [1, 2, 3];

  const stepLabels: Record<number, string> = {
    1: "Project Details",
    2: "Add Members",
    3: "Create Task",
  };

  const resetForm = () => {
    setCurrentStep(1);
    setProjName("");
    setProjDesc("");
    setStep1Error("");
    setSubmitError("");
    setAdvisorAdded(false);
    setAdvisorEmail("");
    setInstructorAdded(false);
    setInstructorEmail("");
    setMembers([]);
    setMemberEmailInput("");
    setMemberRoleInput("member");
    setTaskName("");
    setTaskDesc("");
    setTaskPriority("medium");
    setTaskComplexity("moderate");
    setTaskComplexityPoints("1");
    setTaskCategory("feature");
    setTaskDeadline("");
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

  const handleAddMember = () => {
    if (!memberEmailInput.trim()) return;
    setMembers((prev) => [
      ...prev,
      { email: memberEmailInput.trim(), role: memberRoleInput },
    ]);
    setMemberEmailInput("");
    setMemberRoleInput("member");
  };

  const handleRemoveMember = (index: number) => {
    setMembers((prev) => prev.filter((_, i) => i !== index));
  };

  const executeSubmit = async (includeTask: boolean) => {
    setSubmitError("");

    if (!user?.id) {
      setSubmitError("Authentication error: No active session found.");
      return;
    }

    // Flush any unconfirmed member email typed in the input but not yet added
    const finalMembers: MemberInvite[] = memberEmailInput.trim()
      ? [...members, { email: memberEmailInput.trim(), role: memberRoleInput }]
      : members;

    const payload = {
      name: projName.trim(),
      description: projDesc.trim(),
      created_by: user.id,
      advisor: null,
      instructor: null,
    };

    createProjectMutation.mutate(payload, {
      onSuccess: async (createdProject) => {
        const projectId = createdProject.id;
        const errors: string[] = [];

        // ── Build invite list ──────────────────────────────────────────────
        const invites: ProjectInvitationCreate[] = [];

        if (advisorAdded && advisorEmail.trim()) {
          invites.push({
            project_id: projectId,
            sender_id: user.id,
            email: advisorEmail.trim(),
            role: "advisor",
          });
        }

        if (instructorAdded && instructorEmail.trim()) {
          invites.push({
            project_id: projectId,
            sender_id: user.id,
            email: instructorEmail.trim(),
            role: "instructor",
          });
        }

        for (const member of finalMembers) {
          if (member.email.trim()) {
            invites.push({
              project_id: projectId,
              sender_id: user.id,
              email: member.email,
              role: member.role,
            });
          }
        }

        // ── Send all invites via batch helper ──────────────────────────────
        if (invites.length > 0) {
          const { failed } = await createManyInvitations(invites);
          failed.forEach((email) => errors.push(`Failed to invite: ${email}`));
        }

        // ── Create initial task if provided ────────────────────────────────
        if (includeTask && taskName.trim() && taskDeadline) {
          await createTaskMutation
            .mutateAsync({
              name: taskName.trim(),
              description: taskDesc.trim(),
              created_by: user.id,
              project_id: projectId,
              supertask_id: null,
              status: taskStatus,
              priority: taskPriority,
              complexity: taskComplexity,
              complexity_points: parseInt(taskComplexityPoints) || 1,
              category: taskCategory,
              deadline: new Date(taskDeadline).toISOString(),
              completed_at: null,
              total_time_spent: null,
            })
            .catch(() => errors.push("Failed to create initial task."));
        }

        if (errors.length > 0) {
          setSubmitError(
            `Project created, but some items failed: ${errors.join("; ")}`,
          );
        }

        setOpen(false);
        resetForm();
        onProjectCreated?.();
      },
      onError: (err) => {
        setSubmitError(
          err.message || "An error occurred while creating the project.",
        );
      },
    });
  };

  const isLoading =
    createProjectMutation.isPending || createTaskMutation.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (isLoading) return;
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
            Set up your project, invite your team, and outline your first task.
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
            {/* ── Stepper Nav ── */}
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
                      {stepLabels[step]}
                    </div>
                  </StepperTrigger>
                  {steps.length > step && (
                    <StepperSeparator className="flex-1 mx-2 group-data-[state=completed]/step:bg-green-600" />
                  )}
                </StepperItem>
              ))}
            </StepperNav>

            {/* ── Step Panels ── */}
            <StepperPanel className="text-sm min-h-[220px] pt-2">
              {/* ── Step 1: Project Details ── */}
              <StepperContent value={1} className="space-y-4">
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="proj-name">
                      Project Name <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Input
                      id="proj-name"
                      placeholder="e.g., Q3 Expansion Strategy"
                      value={projName}
                      disabled={isLoading}
                      onChange={(e) => {
                        setProjName(e.target.value);
                        setStep1Error("");
                      }}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="proj-desc">
                      Description <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Input
                      id="proj-desc"
                      placeholder="Brief details about your project roadmap..."
                      value={projDesc}
                      disabled={isLoading}
                      onChange={(e) => {
                        setProjDesc(e.target.value);
                        setStep1Error("");
                      }}
                    />
                  </Field>
                  {step1Error && (
                    <p className="text-xs text-destructive font-medium">
                      {step1Error}
                    </p>
                  )}
                </FieldGroup>
              </StepperContent>

              {/* ── Step 2: Add Members ── */}
              <StepperContent value={2} className="space-y-5">
                {/* Advisor */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-[var(--text-h)] uppercase tracking-wide">
                      Advisor{" "}
                      <span className="text-muted-foreground font-normal normal-case tracking-normal">
                        (optional)
                      </span>
                    </p>
                    {!advisorAdded && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1 text-[#701D0B] hover:text-[#701D0B]/80"
                        onClick={() => setAdvisorAdded(true)}
                        disabled={isLoading}
                      >
                        <Plus className="w-3 h-3" /> Add Advisor
                      </Button>
                    )}
                  </div>
                  {advisorAdded && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="email"
                        placeholder="advisor@institution.edu"
                        value={advisorEmail}
                        disabled={isLoading}
                        onChange={(e) => setAdvisorEmail(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-9 w-9 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          setAdvisorAdded(false);
                          setAdvisorEmail("");
                        }}
                        disabled={isLoading}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="border-t border-[var(--border)]" />

                {/* Instructor */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-[var(--text-h)] uppercase tracking-wide">
                      Instructor{" "}
                      <span className="text-muted-foreground font-normal normal-case tracking-normal">
                        (optional)
                      </span>
                    </p>
                    {!instructorAdded && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1 text-[#701D0B] hover:text-[#701D0B]/80"
                        onClick={() => setInstructorAdded(true)}
                        disabled={isLoading}
                      >
                        <Plus className="w-3 h-3" /> Add Instructor
                      </Button>
                    )}
                  </div>
                  {instructorAdded && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="email"
                        placeholder="instructor@institution.edu"
                        value={instructorEmail}
                        disabled={isLoading}
                        onChange={(e) => setInstructorEmail(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-9 w-9 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          setInstructorAdded(false);
                          setInstructorEmail("");
                        }}
                        disabled={isLoading}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="border-t border-[var(--border)]" />

                {/* Project Members */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[var(--text-h)] uppercase tracking-wide">
                    Project Members
                  </p>

                  {members.length > 0 && (
                    <div className="space-y-1.5 mb-3">
                      {members.map((m, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 text-xs"
                        >
                          <UserPlus className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="flex-1 truncate text-[var(--text-h)]">
                            {m.email}
                          </span>
                          <span className="text-muted-foreground capitalize shrink-0">
                            {m.role}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveMember(i)}
                            disabled={isLoading}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Input
                      type="email"
                      placeholder="member@team.com"
                      value={memberEmailInput}
                      disabled={isLoading}
                      onChange={(e) => setMemberEmailInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddMember();
                        }
                      }}
                      className="flex-1"
                    />
                    <Select
                      value={memberRoleInput}
                      onValueChange={setMemberRoleInput}
                      disabled={isLoading}
                    >
                      <SelectTrigger className="w-32 shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="contributor">Contributor</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0 h-9 w-9 border-[#701D0B]/30 text-[#701D0B] hover:bg-[#701D0B]/5"
                      onClick={handleAddMember}
                      disabled={isLoading || !memberEmailInput.trim()}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Press Enter or click + to add. You can also just type an
                    email and click Finish &amp; Launch — it will be included
                    automatically.
                  </p>
                </div>
              </StepperContent>

              {/* ── Step 3: Create First Task ── */}
              <StepperContent value={3} className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Optionally create your first task. You can skip this and add
                  tasks later.
                </p>
                <FieldGroup>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field className="sm:col-span-2">
                      <FieldLabel htmlFor="task-name">Task Name</FieldLabel>
                      <Input
                        id="task-name"
                        placeholder="e.g., Compile competitive audit"
                        value={taskName}
                        disabled={isLoading}
                        onChange={(e) => setTaskName(e.target.value)}
                      />
                    </Field>

                    <Field className="sm:col-span-2">
                      <FieldLabel htmlFor="task-desc">Description</FieldLabel>
                      <Input
                        id="task-desc"
                        placeholder="What needs to be done?"
                        value={taskDesc}
                        disabled={isLoading}
                        onChange={(e) => setTaskDesc(e.target.value)}
                      />
                    </Field>

                    <Field>
                      <FieldLabel>Priority</FieldLabel>
                      <Select
                        value={taskPriority}
                        onValueChange={setTaskPriority}
                        disabled={isLoading}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRIORITY_OPTIONS.map((p) => (
                            <SelectItem
                              key={p}
                              value={p}
                              className="capitalize"
                            >
                              {p}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field>
                      <FieldLabel>Complexity</FieldLabel>
                      <Select
                        value={taskComplexity}
                        onValueChange={setTaskComplexity}
                        disabled={isLoading}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COMPLEXITY_OPTIONS.map((c) => (
                            <SelectItem
                              key={c}
                              value={c}
                              className="capitalize"
                            >
                              {c.replace("_", " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field>
                      <FieldLabel>Category</FieldLabel>
                      <Select
                        value={taskCategory}
                        onValueChange={setTaskCategory}
                        disabled={isLoading}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORY_OPTIONS.map((c) => (
                            <SelectItem
                              key={c}
                              value={c}
                              className="capitalize"
                            >
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="task-deadline">Deadline</FieldLabel>
                      <Input
                        id="task-deadline"
                        type="datetime-local"
                        value={taskDeadline}
                        disabled={isLoading}
                        onChange={(e) => setTaskDeadline(e.target.value)}
                      />
                    </Field>
                  </div>
                </FieldGroup>
              </StepperContent>
            </StepperPanel>

            {/* ── Footer ── */}
            <DialogFooter className="flex sm:justify-between items-center border-t border-[var(--border)] pt-4 gap-2">
              <div className="w-full sm:w-auto flex justify-start">
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    disabled={isLoading}
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
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                  </DialogClose>
                )}

                {currentStep < 3 ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={isLoading}
                    className="bg-[#701D0B] text-white hover:bg-[#701D0B]/90 w-full sm:w-auto"
                  >
                    Next Step
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={() => executeSubmit(true)}
                    disabled={isLoading}
                    className="bg-[#701D0B] text-white hover:bg-[#701D0B]/90 min-w-[120px]"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Launching...
                      </span>
                    ) : (
                      "Finish & Launch"
                    )}
                  </Button>
                )}
              </div>
            </DialogFooter>
          </Stepper>
        </div>
      </DialogContent>
    </Dialog>
  );
}
