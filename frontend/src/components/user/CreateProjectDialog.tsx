// ADD: Form for adding members and use popover to show if the user exist
// Fix: Be sure the next button for the steps is disabled before all required fields have value
import React, { useState, useEffect, type Dispatch } from "react";
import { Field, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Stepper,
  StepperContent,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperPanel,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from "@/components/reui/stepper";

import { Button } from "@/components/ui/button";
import {
  CheckIcon,
  LoaderCircleIcon,
  FolderCog,
  UserRoundPlus,
  FileSearchCorner,
} from "lucide-react";
import type { UserRead } from "@/services/api";
import { useGetUserByEmailAndRole } from "@/hooks/useAuth";

interface Data {
  projectName: string;
  projectDescription: string;
  admin: string;
  advisor: string;
  instructor: string;
  members: string;
}

function emptyData() {
  return {
    projectName: "",
    projectDescription: "",
    admin: "",
    advisor: "",
    instructor: "",
    members: "",
  };
}

function ProjectDetails({
  formData,
  setFormData,
}: {
  formData: Data;
  setFormData: React.Dispatch<React.SetStateAction<Data>>;
}) {
  return (
    <div className="w-full flex flex-col gap-2">
      <Field>
        <FieldLabel htmlFor="project-name">Project Name</FieldLabel>
        <Input
          id="project-name"
          type="text"
          placeholder="eg. Capstone Collab"
          size={90}
          required
          value={formData.projectName}
          onChange={(e) =>
            setFormData({ ...formData, projectName: e.target.value })
          }
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="input-field-project-name">
          Project Description
        </FieldLabel>
        <Textarea
          id="project-description"
          placeholder="eg. A project Management for PSU Lubao"
          value={formData.projectDescription}
          onChange={(e) =>
            setFormData({ ...formData, projectDescription: e.target.value })
          }
          required
        />
      </Field>
    </div>
  );
}

function AddMember({
  instructorEmail,
  setInstructorEmail,
  advisorEmail,
  setAdvisorEmail,
  memberEmail,
  setMemberEmail,
}: {
  instructorEmail: string;
  setInstructorEmail: Dispatch<React.SetStateAction<string>>;
  advisorEmail: string;
  setAdvisorEmail: Dispatch<React.SetStateAction<string>>;
  memberEmail: string;
  setMemberEmail: Dispatch<React.SetStateAction<string>>;
}) {
  return (
    <div className="w-full flex flex-col gap-2">
      <Field>
        <FieldLabel htmlFor="instructor">
          Instructor <span className="text-muted-foreground">(Optional)</span>
        </FieldLabel>
        <Input
          id="Instructor"
          type="text"
          placeholder="eg. Capstone Collab"
          value={instructorEmail}
          onChange={(e) => setInstructorEmail(e.target.value)}
          size={90}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="advisor">
          Adivisor <span className="text-muted-foreground">(Optional)</span>
        </FieldLabel>
        <Input
          id="advisor"
          type="text"
          placeholder="eg. Capstone Collab"
          value={advisorEmail}
          onChange={(e) => setAdvisorEmail(e.target.value)}
          size={90}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="members">Members</FieldLabel>
        <Input
          id="members"
          type="text"
          placeholder="eg. Capstone Collab"
          value={memberEmail}
          onChange={(e) => setMemberEmail(e.target.value)}
          size={90}
        />
      </Field>
    </div>
  );
}

function ReivewProjectDetails({ formData }: { formData: Data }) {
  return (
    <div className="w-full flex flex-col gap-2">
      <h2>Double check everything before submitting</h2>
      <Field>
        <FieldLabel htmlFor="project-name">ProjectName</FieldLabel>
        <Input
          id="project-name"
          type="text"
          placeholder="eg. Capstone Collab"
          value={formData.projectName}
          disabled
          size={90}
        />
      </Field>
    </div>
  );
}

const steps = [
  {
    title: "Project Details",
    icon: <FolderCog className="size-4" />,
  },
  {
    title: "Add Members",
    icon: <UserRoundPlus className="size-4" />,
  },
  {
    title: "Review",
    icon: <FileSearchCorner className="size-4" />,
  },
];

export default function CreateProjectDialog() {
  // Changed initial state to 1 to match step={index + 1}
  const [currentStep, setCurrentStep] = useState(1);
  // Form data project creation
  const [formData, setFormData] = useState(emptyData());
  const [advisorEmail, setAdvisorEmail] = useState<string>("");
  const [instructorEmail, setInstructorEmail] = useState<string>("");
  const [foundMembers, setFoundMembers] = useState<UserRead[]>([]);

  return (
    <div className="flex justify-center items-center w-full">
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline">Create +</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[1000px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Create your new project</DialogTitle>
            <DialogDescription>
              Setup your project and invite your team.{" "}
            </DialogDescription>
          </DialogHeader>
          <div className="mx-4 max-h-[50vh] px-4 overflow-y-auto no-scrollbar">
            <Stepper
              value={currentStep}
              onValueChange={setCurrentStep}
              indicators={{
                completed: <CheckIcon className="size-3.5" />,
                loading: <LoaderCircleIcon className="size-3.5 animate-spin" />,
              }}
              className=" w-full  space-y-8"
            >
              <StepperNav className="gap-3">
                {steps.map((step, index) => (
                  <StepperItem
                    key={index}
                    step={index + 1}
                    className="relative flex "
                  >
                    <StepperTrigger
                      className="flex grow flex-col items-start  borerjustify-center gap-2.5"
                      asChild
                    >
                      <StepperIndicator className="data-[state=inactive]:border-border data-[state=inactive]:text-muted-foreground data-[state=completed]:bg-success size-8 border-2 data-[state=completed]:text-white data-[state=inactive]:bg-transparent">
                        {step.icon}
                      </StepperIndicator>
                      <div className="flex flex-col items-start gap-1">
                        <div className="text-muted-foreground text-[10px] font-semibold uppercase">
                          Step {index + 1}
                        </div>
                        <StepperTitle className="group-data-[state=inactive]/step:text-muted-foreground text-start text-base font-semibold">
                          {step.title}
                        </StepperTitle>
                      </div>
                    </StepperTrigger>
                    {steps.length > index + 1 && (
                      <StepperSeparator className="group-data-[state=completed]/step:bg-success absolute inset-x-0 start-9 top-4 m-0 group-data-[orientation=horizontal]/stepper-nav:w-[calc(100%-2rem)] group-data-[orientation=horizontal]/stepper-nav:flex-none" />
                    )}
                  </StepperItem>
                ))}
              </StepperNav>

              <StepperPanel className="text-sm">
                {steps.map((step, index) => (
                  <StepperContent
                    key={index}
                    value={index + 1}
                    className="flex items-center justify-center"
                  >
                    {step.content(formData, setFormData)}
                  </StepperContent>
                ))}
              </StepperPanel>

              <div className=" flex items-center justify-between w-full"></div>
            </Stepper>
          </div>
          <DialogFooter>
            <div className="w-full flex justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentStep((prev) => prev - 1)}
                disabled={currentStep === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentStep((prev) => prev + 1)}
                disabled={currentStep === steps.length}
              >
                Next
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
