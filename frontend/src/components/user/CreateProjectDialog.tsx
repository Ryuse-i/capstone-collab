// Improve popover ui
// fix member email being to formdata instead of ids
import React, { useState, useEffect, useRef, type Dispatch } from "react";
import { Field, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { X } from "lucide-react";
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
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandEmpty,
} from "@/components/ui/command";
import { useGetUserByEmailAndRole } from "@/hooks/useAuth";
import { useCurrentUser } from "@/hooks/useAuth";
import { useCreateProject } from "@/hooks/useProject";
import { useCreateMember } from "@/hooks/useProjectMember";
import type { UserRead } from "@/services/api";
import type { CreateProjectMember } from "@/types/project_member";
import type { ProjectResponse, ProjectBase } from "@/types/project";

interface Data {
  name: string;
  description: string;
  created_by: string;
  advisor: string;
  instructor: string;
}

interface Member {
  id: string;
  email: string;
}

function emptyData(): Data {
  return {
    name: "",
    description: "",
    created_by: "",
    advisor: "",
    instructor: "",
  };
}

function useDebounce<T>(value: T, timer: number): T {
  const [debounceValue, setDebounceValue] = useState(value);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebounceValue(value);
    }, timer);

    return () => clearTimeout(timeoutId);
  }, [value, timer]);

  return debounceValue;
}

// Minimum characters before we bother searching at all.
const MIN_SEARCH_LENGTH = 3;

function useMemberSearch(email: string, role: string, debounceMs = 400) {
  const debouncedEmail = useDebounce(email, debounceMs);
  const { data, isFetching } = useGetUserByEmailAndRole(debouncedEmail, role);

  return {
    results: data ?? [],
    // Only show "loading" once we've actually got enough characters to search.
    isLoading: isFetching && debouncedEmail.trim().length >= MIN_SEARCH_LENGTH,
    // Whether the *current* (non-debounced) input is long enough to search on.
    isSearchable: email.trim().length >= MIN_SEARCH_LENGTH,
  };
}

function addInstructorToFormData(
  id: string,
  formData: Data,
  setFormData: Dispatch<React.SetStateAction<Data>>,
) {
  setFormData({ ...formData, instructor: id });
}

function removeInstructorInFormData(
  formData: Data,
  setFormData: Dispatch<React.SetStateAction<Data>>,
) {
  setFormData({ ...formData, instructor: "" });
}

function addAdvisorToFormData(
  id: string,
  formData: Data,
  setFormData: Dispatch<React.SetStateAction<Data>>,
) {
  setFormData({ ...formData, advisor: id });
}

function removeAdvisorInFormData(
  formData: Data,
  setFormData: Dispatch<React.SetStateAction<Data>>,
) {
  setFormData({ ...formData, advisor: "" });
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
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="project-description">
          Project Description
        </FieldLabel>
        <Textarea
          id="project-description"
          placeholder="eg. A project Management for PSU Lubao"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          required
        />
      </Field>
    </div>
  );
}

/**
 * Reusable search-and-select field. Handles opening the popover, showing a
 * loading row while the debounced query is in flight, an empty-state row
 * when nothing matches, and the list of results otherwise.
 */
function SearchSelectField({
  id,
  label,
  optional,
  placeholder,
  email,
  setEmail,
  results,
  isLoading,
  isSearchable,
  selectedValue,
  onSelect,
  onRemove,
}: {
  id: string;
  label: string;
  optional?: boolean;
  placeholder: string;
  email: string;
  setEmail: Dispatch<React.SetStateAction<string>>;
  results: UserRead[];
  isLoading: boolean;
  isSearchable: boolean;
  selectedValue: string;
  onSelect: (user: UserRead) => void;
  onRemove: () => void;
}) {
  const [inputActive, setInputActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep the popover open as soon as the user has typed enough to search,
  // so the loading / empty states are visible, not just the results list.
  const showPopover = inputActive && isSearchable;

  return (
    <Field>
      <FieldLabel htmlFor={id}>
        {label}
        {optional && <span className="text-muted-foreground"> (Optional)</span>}
      </FieldLabel>
      {selectedValue ? (
        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <span>{selectedValue}</span>
          <button type="button" onClick={onRemove}>
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <Popover open={showPopover}>
          <PopoverAnchor asChild>
            <Input
              ref={inputRef}
              id={id}
              type="text"
              placeholder={placeholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setInputActive(true)}
              onBlur={() => setInputActive(false)}
              size={90}
            />
          </PopoverAnchor>
          <PopoverContent
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
            className="w-[--radix-popover-trigger-width] p-0"
          >
            <Command shouldFilter={false}>
              <CommandList>
                {isLoading ? (
                  <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                    <LoaderCircleIcon className="size-3.5 animate-spin" />
                    Searching...
                  </div>
                ) : results.length === 0 ? (
                  <CommandEmpty className="px-3 py-2 text-sm text-muted-foreground">
                    No user found
                  </CommandEmpty>
                ) : (
                  <CommandGroup>
                    {results.map((user) => (
                      <CommandItem
                        key={user.id}
                        value={user.email}
                        // onMouseDown fires before the input's onBlur, so the
                        // selection registers before the popover closes.
                        onMouseDown={(e) => e.preventDefault()}
                        onSelect={() => {
                          onSelect(user);
                          setInputActive(false);
                        }}
                      >
                        {user.email}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </Field>
  );
}

/**
 * Multi-select variant of SearchSelectField for Members. Keeps id + email
 * paired together in a single `Member[]` so formData.members (ids) can never
 * drift out of sync with what's rendered as chips (emails).
 */
function MemberSearchField({
  members,
  setMembers,
  memberEmail,
  setMemberEmail,
  memberSearch,
}: {
  members: Member[];
  setMembers: Dispatch<React.SetStateAction<Member[]>>;
  memberEmail: string;
  setMemberEmail: Dispatch<React.SetStateAction<string>>;
  memberSearch: ReturnType<typeof useMemberSearch>;
}) {
  const [inputActive, setInputActive] = useState(false);

  const showPopover = inputActive && memberSearch.isSearchable;

  // Don't show someone in the Members results who's already been added.
  const availableMemberResults = memberSearch.results.filter(
    (user) => !members.some((m) => m.email === user.email),
  );

  const addMember = (user: UserRead) => {
    setMembers((prev) => [...prev, { id: user.id, email: user.email }]);
    setMemberEmail("");
    setInputActive(false);
  };

  const removeMember = (email: string) => {
    setMembers((prev) => prev.filter((m) => m.email !== email));
  };

  return (
    <Field>
      <FieldLabel htmlFor="members">Members</FieldLabel>
      <Popover open={showPopover}>
        <PopoverAnchor asChild>
          <Input
            id="members"
            type="text"
            placeholder="eg. member@gmail.com"
            value={memberEmail}
            onChange={(e) => setMemberEmail(e.target.value)}
            onFocus={() => setInputActive(true)}
            onBlur={() => setInputActive(false)}
            size={90}
          />
        </PopoverAnchor>
        <PopoverContent
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          className="w-[--radix-popover-trigger-width] p-0"
        >
          <Command shouldFilter={false}>
            <CommandList>
              {memberSearch.isLoading ? (
                <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                  <LoaderCircleIcon className="size-3.5 animate-spin" />
                  Searching...
                </div>
              ) : availableMemberResults.length === 0 ? (
                <CommandEmpty className="px-3 py-2 text-sm text-muted-foreground">
                  No user found
                </CommandEmpty>
              ) : (
                <CommandGroup>
                  {availableMemberResults.map((user) => (
                    <CommandItem
                      key={user.id}
                      value={user.email}
                      onMouseDown={(e) => e.preventDefault()}
                      onSelect={() => addMember(user)}
                    >
                      {user.email}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {members.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-1 rounded-full border px-3 py-1 text-sm"
            >
              <span>{member.email}</span>
              <button
                type="button"
                // Prevent the members input's onBlur from firing/re-rendering
                // before the click registers (same race the popover items
                // guard against below).
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => removeMember(member.email)}
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </Field>
  );
}

function AddMember({
  instructorEmail,
  setInstructorEmail,
  instructorLabel,
  setInstructorLabel,
  advisorLabel,
  setAdvisorLabel,
  advisorEmail,
  setAdvisorEmail,
  memberEmail,
  setMemberEmail,
  members,
  setMembers,
  formData,
  setFormData,
  instructorSearch,
  advisorSearch,
  memberSearch,
}: {
  instructorEmail: string;
  setInstructorEmail: Dispatch<React.SetStateAction<string>>;
  instructorLabel: string;
  setInstructorLabel: Dispatch<React.SetStateAction<string>>;
  advisorLabel: string;
  setAdvisorLabel: Dispatch<React.SetStateAction<string>>;
  advisorEmail: string;
  setAdvisorEmail: Dispatch<React.SetStateAction<string>>;
  memberEmail: string;
  setMemberEmail: Dispatch<React.SetStateAction<string>>;
  members: Member[];
  setMembers: Dispatch<React.SetStateAction<Member[]>>;
  formData: Data;
  setFormData: Dispatch<React.SetStateAction<Data>>;
  instructorSearch: ReturnType<typeof useMemberSearch>;
  advisorSearch: ReturnType<typeof useMemberSearch>;
  memberSearch: ReturnType<typeof useMemberSearch>;
}) {
  return (
    <div className="w-full flex flex-col gap-2">
      <SearchSelectField
        id="instructor"
        label="Instructor"
        placeholder="eg. instructor@gmail.com"
        email={instructorEmail}
        setEmail={setInstructorEmail}
        results={instructorSearch.results}
        isLoading={instructorSearch.isLoading}
        isSearchable={instructorSearch.isSearchable}
        selectedValue={instructorLabel}
        onSelect={(user) => {
          addInstructorToFormData(user.id, formData, setFormData);
          setInstructorEmail("");
          setInstructorLabel(user.email);
        }}
        onRemove={() => {
          removeInstructorInFormData(formData, setFormData);
          setInstructorEmail("");
          setInstructorLabel("");
        }}
      />

      <SearchSelectField
        id="advisor"
        label="Advisor"
        optional
        placeholder="eg. advisor@gmail.com"
        email={advisorEmail}
        setEmail={setAdvisorEmail}
        results={advisorSearch.results}
        isLoading={advisorSearch.isLoading}
        isSearchable={advisorSearch.isSearchable}
        selectedValue={advisorLabel}
        onSelect={(user) => {
          addAdvisorToFormData(user.id, formData, setFormData);
          setAdvisorEmail("");
          setAdvisorLabel(user.email);
        }}
        onRemove={() => {
          removeAdvisorInFormData(formData, setFormData);
          setAdvisorEmail("");
          setAdvisorLabel("");
        }}
      />

      <MemberSearchField
        members={members}
        setMembers={setMembers}
        memberEmail={memberEmail}
        setMemberEmail={setMemberEmail}
        memberSearch={memberSearch}
      />
    </div>
  );
}

function ReviewProjectDetails({
  formData,
  members,
  instructorLabel,
  advisorLabel,
}: {
  formData: Data;
  members: Member[];
  instructorLabel: string;
  advisorLabel: string;
}) {
  return (
    <div className="w-full flex flex-col gap-2">
      <h2 className="text-gray-500">
        Double check everything before submitting
      </h2>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col ">
          <h2>Project Details</h2>
          <div className="border border-gray-400">
            <div className="mx-5">
              <h3 className="text-gray-400">
                Project name:
                <span className="mx-2 text-white">{formData.name}</span>
              </h3>
              <div className="flex gap-3">
                <h3 className="text-gray-400 border">Project description:</h3>
                <div className="border max-w-xl">
                  <p className="break-word whitespace-pre-wrap">
                    {formData.description}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div>
          <h2>Members</h2>
          <div className="flex flex-col mx-5">
            <div className="flex gap-1">
              <h3>Instructor:</h3>
              <div className="text-gray-400">{instructorLabel}</div>
            </div>
            <div className="flex gap-1">
              <h3>Advisor:</h3>
              <div className="text-gray-400">{advisorLabel}</div>
            </div>
            <div className="flex gap-1">
              <h3>Members:</h3>
              <div className="text-gray-400">
                {members.map((m) => m.email).join(", ")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const STEPS = [
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
  const [advisorEmail, setAdvisorEmail] = useState<string>("");
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState(emptyData());
  const [instructorEmail, setInstructorEmail] = useState<string>("");
  const [instructorLabel, setInstructorLabel] = useState<string>("");
  const [advisorLabel, setAdvisorLabel] = useState<string>("");
  // Single source of truth for members: id + email kept together so
  // formData.members (ids) can never fall out of sync with the chips (emails).
  const [members, setMembers] = useState<Member[]>([]);
  const [memberEmail, setMemberEmail] = useState<string>("");

  const instructorSearch = useMemberSearch(instructorEmail, "instructor");
  const advisorSearch = useMemberSearch(advisorEmail, "advisor");
  const memberSearch = useMemberSearch(memberEmail, "student");

  const { data: user } = useCurrentUser();
  const { mutate: projectMutate, isPending: isProjectPending } =
    useCreateProject();
  const { mutate: memberMutate, isPending: isMemberPending } =
    useCreateMember();

  function handleSubmit() {
    const payload = user ? { ...formData, created_by: user.id } : formData;

    projectMutate(payload, {
      onSuccess: (newProject: ProjectResponse) => {
        console.log("project created: ", newProject);
        members.forEach((member) => {
          const addMember: CreateProjectMember = {
            user_id: member.id,
            project_id: newProject.id,
            project_role: "member",
          };
          memberMutate(addMember, {
            onSuccess: (newMember) => {
              console.log("Added member: ", newMember);
            },
            onError: (error) => {
              console.error("Failed to add member: ", error);
            },
          });
        }); // closes forEach(...)
      },
      onError: (error) => {
        console.error("failed to create project", error);
      },
    });
  }

  useEffect(() => {
    console.log("Current Formdata: ", formData);
  }, [formData]);

  useEffect(() => {
    console.log("members: ", members);
  }, [members]);

  // Required fields per step - drives the Next button's disabled state.
  const isStepValid = (step: number) => {
    switch (step) {
      case 1:
        return (
          formData.name.trim().length > 0 &&
          formData.description.trim().length > 0
        );
      case 2:
        return formData.instructor.trim().length > 0;
      default:
        return true;
    }
  };

  const renderStep = (step: number) => {
    switch (step) {
      case 1:
        return <ProjectDetails formData={formData} setFormData={setFormData} />;

      case 2:
        return (
          <AddMember
            instructorEmail={instructorEmail}
            setInstructorEmail={setInstructorEmail}
            instructorLabel={instructorLabel}
            setInstructorLabel={setInstructorLabel}
            advisorLabel={advisorLabel}
            setAdvisorLabel={setAdvisorLabel}
            advisorEmail={advisorEmail}
            setAdvisorEmail={setAdvisorEmail}
            memberEmail={memberEmail}
            setMemberEmail={setMemberEmail}
            members={members}
            setMembers={setMembers}
            formData={formData}
            setFormData={setFormData}
            instructorSearch={instructorSearch}
            advisorSearch={advisorSearch}
            memberSearch={memberSearch}
          />
        );
      case 3:
        return (
          <ReviewProjectDetails
            formData={formData}
            members={members}
            instructorLabel={instructorLabel}
            advisorLabel={advisorLabel}
          />
        );
    }
  };

  return (
    <div className="flex justify-center items-center w-full">
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline">Create +</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-250 max-h-[90vh] flex flex-col">
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
                {STEPS.map((step, index) => (
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
                    {STEPS.length > index + 1 && (
                      <StepperSeparator className="group-data-[state=completed]/step:bg-success absolute inset-x-0 inset-s-9 top-4 m-0 group-data-[orientation=horizontal]/stepper-nav:w-[calc(100%-2rem)] group-data-[orientation=horizontal]/stepper-nav:flex-none" />
                    )}
                  </StepperItem>
                ))}
              </StepperNav>

              <StepperPanel className="text-sm">
                {STEPS.map((_step, index) => (
                  <StepperContent
                    key={index}
                    value={index + 1}
                    className="flex items-center justify-center"
                  >
                    {renderStep(index + 1)}
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
              {currentStep === STEPS.length ? (
                <Button
                  variant="outline"
                  onClick={handleSubmit}
                  disabled={isProjectPending}
                >
                  {isProjectPending ? "Submitting..." : "Submit"}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep((prev) => prev + 1)}
                  disabled={!isStepValid(currentStep)}
                >
                  Next
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
