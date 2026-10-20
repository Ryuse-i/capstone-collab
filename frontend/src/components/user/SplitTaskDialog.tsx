import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  CalendarIcon,
  Check,
  ChevronDown,
  Info,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ComplexityBadge } from "@/components/user/TaskRationaleDialog";
import { cn } from "@/lib/utils";

import { useCurrentUser } from "@/hooks/useAuth";
import { useCreateTask, useUpdateTask, taskKeys } from "@/hooks/useTask";
import { useGetAllProjectSupertasks } from "@/hooks/useSupertask";
import { useGetMembersWithUserInfo } from "@/hooks/useProjectMember";
import {
  useGetAllAssignedMembers,
  useCreateAssignedMember,
  useDeleteAssignedMember,
  assignedMemberKeys,
} from "@/hooks/useAssignedMember";
import {
  useGetTaskReviewers,
  useCreateAssignedReviewer,
  useUpdateAssignedReviewer,
  useDeleteAssignedReviewer,
} from "@/hooks/useCreateAssignedReviewer";
import { projectKeys } from "@/hooks/useProject";

import type { Skill } from "@/types/project_member";
import type {
  CreateTask as CreateTaskPayload,
  UpdateTask,
  TaskPriority,
} from "@/types/task";
import type { RecommendationResponse } from "@/types/redistributionRecommendation";

// ---------------------------------------------------------------------------
// Constants (same options as AddTaskDialog / EditTaskDialog)
// ---------------------------------------------------------------------------

const PRIORITY_OPTIONS: {
  value: TaskPriority;
  label: string;
  color: string;
}[] = [
  { value: "low", label: "Low", color: "#9ca3af" },
  { value: "medium", label: "Medium", color: "#eab308" },
  { value: "high", label: "High", color: "#ef4444" },
];

const SKILL_OPTIONS: { value: Skill; label: string }[] = [
  { value: "Backend Development", label: "Backend Development" },
  { value: "Frontend Development", label: "Frontend Development" },
  { value: "Mobile Development", label: "Mobile Development" },
  { value: "IOT Development", label: "IOT Development" },
  { value: "Database Design", label: "Database Design" },
  { value: "System Architecture", label: "System Architecture" },
  { value: "UI/UX Design", label: "UI/UX Design" },
  { value: "Testing and Quality Assurance", label: "Testing and QA" },
  { value: "Literature Review", label: "Literature Review" },
  { value: "Data Collection", label: "Data Collection" },
  {
    value: "Survey and Questionnaire Design",
    label: "Survey/Questionnaire Design",
  },
  { value: "Interview and Observation", label: "Interview and Observation" },
  { value: "Data Analysis", label: "Data Analysis" },
  { value: "Technical Writing", label: "Technical Writing" },
  { value: "Documentation", label: "Documentation" },
  { value: "Diagram and Modeling", label: "Diagram and Modeling" },
  { value: "Editing and Proofreading", label: "Editing and Proofreading" },
  { value: "Financial Documentation", label: "Financial Documentation" },
  { value: "Budget Planning", label: "Budget Planning" },
  { value: "Resource Management", label: "Resource Management" },
];

// Mirrors _CATEGORY_SKILLS in the backend AI service, so editing the primary
// skill keeps the task's category right without another AI call.
const SKILL_CATEGORY: Record<string, string> = {
  "Backend Development": "development",
  "Frontend Development": "development",
  "Mobile Development": "development",
  "IOT Development": "development",
  "Database Design": "development",
  "System Architecture": "development",
  "UI/UX Design": "development",
  "Testing and Quality Assurance": "development",
  "Literature Review": "research",
  "Data Collection": "research",
  "Survey and Questionnaire Design": "research",
  "Interview and Observation": "research",
  "Data Analysis": "research",
  "Technical Writing": "document",
  Documentation: "document",
  "Diagram and Modeling": "document",
  "Editing and Proofreading": "document",
  "Financial Documentation": "finance",
  "Budget Planning": "finance",
  "Resource Management": "finance",
};

const POINTS_TO_COMPLEXITY = { 1: "low", 2: "medium", 3: "high" } as const;

function complexityOf(points: number) {
  return POINTS_TO_COMPLEXITY[Math.min(Math.max(points, 1), 3) as 1 | 2 | 3];
}

function categoryOf(skill: string, fallback?: string | null) {
  return SKILL_CATEGORY[skill] ?? fallback ?? undefined;
}

function skillLabel(skill: string) {
  return SKILL_OPTIONS.find((o) => o.value === skill)?.label ?? skill;
}

/** Parses "yyyy-MM-dd" as a LOCAL date (a bare new Date("2026-10-15") is UTC). */
function parseLocalDate(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00`);
}

function errorMessage(err: unknown, fallback: string): string {
  const e = err as {
    response?: {
      data?: { message?: string | string[]; error?: string; detail?: string };
    };
    message?: string;
  };
  const data = e?.response?.data;
  const fromServer = Array.isArray(data?.message)
    ? data.message.join(", ")
    : (data?.message ?? data?.error ?? data?.detail);
  return fromServer || e?.message || fallback;
}

// ---------------------------------------------------------------------------
// Form state
// ---------------------------------------------------------------------------

type AssignableMember = {
  member_id: string;
  id: string;
  first_name: string;
  last_name: string;
};

type PartForm = {
  title: string;
  description: string;
  priority: TaskPriority;
  supertask_id: string | null;
  deadline: string;
  primary_skill: Skill | "";
  secondary_skills: Skill[];
  /** null = untouched (use the default list) */
  memberIds: string[] | null;
  /** undefined = untouched (use the saved reviewer), null = cleared */
  reviewerId: string | null | undefined;
};

type PartData = {
  title: string;
  description: string;
  complexity_points: number;
  primary_skill: string;
  secondary_skills: string[];
  category?: string | null;
};

function formFromPart(
  part: PartData,
  base: {
    priority: TaskPriority;
    supertask_id: string | null;
    deadline: string;
  },
): PartForm {
  return {
    title: part.title ?? "",
    description: part.description ?? "",
    priority: base.priority,
    supertask_id: base.supertask_id,
    deadline: base.deadline,
    primary_skill: (part.primary_skill ?? "") as Skill | "",
    // A skill can't be both primary and secondary.
    secondary_skills: ((part.secondary_skills ?? []) as Skill[]).filter(
      (s) => s !== part.primary_skill,
    ),
    memberIds: null,
    reviewerId: undefined,
  };
}

function validatePart(
  label: string,
  form: PartForm,
  memberIds: string[],
): string | null {
  if (!form.title.trim()) return `${label}: name is required.`;
  if (!form.description.trim()) return `${label}: description is required.`;
  if (!form.deadline) return `${label}: deadline is required.`;
  if (!form.primary_skill) return `${label}: primary skill is required.`;
  if (form.secondary_skills.length === 0)
    return `${label}: at least one secondary skill is required.`;
  if (memberIds.length === 0)
    return `${label}: at least one assigned member is required.`;
  return null;
}

// ---------------------------------------------------------------------------
// Small field components (module level so React doesn't remount them)
// ---------------------------------------------------------------------------

function MemberAvatar({
  member,
  className,
  textClassName,
}: {
  member: AssignableMember;
  className?: string;
  textClassName?: string;
}) {
  const name = `${member.first_name} ${member.last_name}`.trim();
  const initials =
    `${member.first_name?.[0] ?? ""}${member.last_name?.[0] ?? ""}` || "?";

  return (
    <Avatar
      title={name}
      className={cn(
        "size-8 border-2 border-gray-300 bg-primary dark:border-gray-600 dark:bg-gray-800",
        className,
      )}
    >
      <AvatarFallback
        className={cn(
          "rounded-full bg-primary text-10 font-bold uppercase text-primary-foreground dark:bg-gray-800 dark:text-foreground",
          textClassName,
        )}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

function Required() {
  return <span className="text-red-500">*</span>;
}

function MemberChip({
  member,
  onRemove,
}: {
  member: AssignableMember;
  onRemove: () => void;
}) {
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-(--maroon)/20 bg-[#FBF3E7] py-0.5 pl-0.5 pr-2 text-xs text-[#231A2E] dark:bg-[#FBF3E7]/20 dark:text-[#FBF3E7]">
      <MemberAvatar
        member={member}
        className="size-6"
        textClassName="text-[9px]"
      />
      {member.first_name} {member.last_name}
      <button
        type="button"
        onClick={onRemove}
        className="rounded-full hover:bg-(--maroon)/10"
        aria-label={`Remove ${member.first_name} ${member.last_name}`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

function PrimarySkillSelect({
  value,
  excluded,
  onChange,
}: {
  value: Skill | "";
  excluded: Skill[];
  onChange: (skill: Skill) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between text-left font-normal"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value ? skillLabel(value) : "Select skill"}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <div
          className="max-h-64 overflow-y-auto overscroll-contain custom-scrollbar p-1"
          onWheel={(e) => e.stopPropagation()}
        >
          {SKILL_OPTIONS.filter((o) => !excluded.includes(o.value)).map(
            (option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
              >
                <span>{option.label}</span>
                {value === option.value && (
                  <Check className="h-4 w-4 text-popover-foreground" />
                )}
              </button>
            ),
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SecondarySkillSelect({
  value,
  primary,
  onToggle,
}: {
  value: Skill[];
  primary: Skill | "";
  onToggle: (skill: Skill) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={!primary}
            className="w-full justify-between text-left font-normal"
          >
            <span
              className={cn(
                "truncate",
                value.length === 0 && "text-muted-foreground",
              )}
            >
              {!primary
                ? "Select a primary skill first"
                : value.length === 0
                  ? "Select skills"
                  : `${value.length} skill${value.length > 1 ? "s" : ""} selected`}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <div
            className="max-h-64 overflow-y-auto overscroll-contain custom-scrollbar p-1"
            onWheel={(e) => e.stopPropagation()}
          >
            {SKILL_OPTIONS.filter((o) => o.value !== primary).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onToggle(option.value)}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
              >
                <span>{option.label}</span>
                {value.includes(option.value) && (
                  <Check className="h-4 w-4 text-popover-foreground" />
                )}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {value.map((skill) => (
            <span
              key={skill}
              className="flex items-center gap-1 rounded-sm border border-[#7A0C2E]/20 bg-(--maroon) px-2 py-0.5 text-xs font-medium text-white"
            >
              {skillLabel(skill)}
              <button
                type="button"
                onClick={() => onToggle(skill)}
                className="rounded-full hover:bg-white/20"
                aria-label={`Remove ${skill}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function SupertaskSelect({
  supertasks,
  value,
  loading,
  error,
  onChange,
}: {
  supertasks: { id: string | number; name: string }[];
  value: string | null;
  loading: boolean;
  error: boolean;
  onChange: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = supertasks.find((s) => String(s.id) === value) ?? null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={loading}
          className="w-full justify-between text-left font-normal"
        >
          <span
            className={cn("truncate", !selected && "text-muted-foreground")}
          >
            {loading
              ? "Loading supertasks..."
              : selected
                ? selected.name
                : "No supertask"}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <div
          className="max-h-64 overflow-y-auto overscroll-contain custom-scrollbar p-1"
          onWheel={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
          >
            <span>No supertask</span>
            {!value && <Check className="h-4 w-4 text-popover-foreground" />}
          </button>

          {error && (
            <p className="px-2 py-2 text-sm text-rose-600">
              Couldn't load supertasks.
            </p>
          )}

          {!error && supertasks.length === 0 && (
            <p className="px-2 py-2 text-sm text-neutral-500">
              No supertasks created yet.
            </p>
          )}

          {!error &&
            supertasks.map((supertask) => (
              <button
                key={supertask.id}
                type="button"
                onClick={() => {
                  onChange(String(supertask.id));
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
              >
                <span>{supertask.name}</span>
                {String(supertask.id) === value && (
                  <Check className="h-4 w-4 text-popover-foreground" />
                )}
              </button>
            ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function MemberMultiSelect({
  options,
  selectedIds,
  loading,
  error,
  onToggle,
}: {
  options: AssignableMember[];
  selectedIds: string[];
  loading: boolean;
  error: boolean;
  onToggle: (member: AssignableMember) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.filter((m) => selectedIds.includes(m.member_id));

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={loading}
            className="w-full justify-between text-left font-normal"
          >
            <span
              className={cn(
                "truncate",
                selected.length === 0 && "text-muted-foreground",
              )}
            >
              {loading
                ? "Loading members..."
                : selected.length === 0
                  ? "Select members"
                  : `${selected.length} member${selected.length > 1 ? "s" : ""} selected`}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <div
            className="max-h-64 overflow-y-auto overscroll-contain custom-scrollbar p-1"
            onWheel={(e) => e.stopPropagation()}
          >
            {error && (
              <p className="px-2 py-2 text-sm text-rose-600">
                Couldn't load members.
              </p>
            )}

            {!error && options.length === 0 && (
              <p className="px-2 py-2 text-sm text-neutral-500">
                No members with the "member" role on this project.
              </p>
            )}

            {options.map((member) => (
              <button
                key={member.member_id}
                type="button"
                onClick={() => onToggle(member)}
                className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
              >
                <div className="flex items-center gap-2">
                  <MemberAvatar member={member} />
                  <span>
                    {member.first_name} {member.last_name}
                  </span>
                </div>
                {selectedIds.includes(member.member_id) && (
                  <Check className="h-4 w-4 text-popover-foreground" />
                )}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {selected.map((member) => (
            <MemberChip
              key={member.member_id}
              member={member}
              onRemove={() => onToggle(member)}
            />
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Select the members who will be assigned to this task.
      </p>
    </div>
  );
}

function ReviewerSelect({
  options,
  selectedId,
  loading,
  error,
  onToggle,
}: {
  options: AssignableMember[];
  selectedId: string | null;
  loading: boolean;
  error: boolean;
  onToggle: (member: AssignableMember) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((m) => m.member_id === selectedId) ?? null;

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={loading}
            className="w-full justify-between text-left font-normal"
          >
            <span
              className={cn("truncate", !selected && "text-muted-foreground")}
            >
              {loading
                ? "Loading members..."
                : selected
                  ? `${selected.first_name} ${selected.last_name}`
                  : "Select reviewer"}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <div
            className="max-h-64 overflow-y-auto overscroll-contain custom-scrollbar p-1"
            onWheel={(e) => e.stopPropagation()}
          >
            {error && (
              <p className="px-2 py-2 text-sm text-rose-600">
                Couldn't load members.
              </p>
            )}

            {!error && options.length === 0 && (
              <p className="px-2 py-2 text-sm text-neutral-500">
                No eligible reviewers (leader, advisor, instructor) on this
                project.
              </p>
            )}

            {options.map((member) => (
              <button
                key={member.member_id}
                type="button"
                onClick={() => {
                  onToggle(member);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
              >
                <div className="flex items-center gap-2">
                  <MemberAvatar member={member} />
                  <span>
                    {member.first_name} {member.last_name}
                  </span>
                </div>
                {member.member_id === selectedId && (
                  <Check className="h-4 w-4 text-popover-foreground" />
                )}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {selected && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          <MemberChip member={selected} onRemove={() => onToggle(selected)} />
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Select the reviewer for this task (leader, advisor, or instructor only).
      </p>
    </div>
  );
}

function DeadlineField({
  value,
  today,
  onChange,
}: {
  value: string;
  today: Date;
  onChange: (value: string) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(parseLocalDate(value), "PPP") : "Pick a date"}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={value ? parseLocalDate(value) : undefined}
          onSelect={(date) => onChange(date ? format(date, "yyyy-MM-dd") : "")}
          disabled={{ before: today }}
        />
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// One editable panel (used for both the original task and the new task)
// ---------------------------------------------------------------------------

type EditorContext = {
  assignableMembers: AssignableMember[];
  eligibleReviewers: AssignableMember[];
  supertasks: { id: string | number; name: string }[];
  membersLoading: boolean;
  membersError: boolean;
  supertasksLoading: boolean;
  supertasksError: boolean;
  today: Date;
};

function PartEditor({
  idPrefix,
  heading,
  ownerName,
  note,
  highlight = false,
  form,
  onChange,
  points,
  defaultMemberIds,
  savedReviewerId,
  ctx,
}: {
  idPrefix: string;
  heading: string;
  ownerName: string;
  note: string;
  highlight?: boolean;
  form: PartForm;
  onChange: (patch: Partial<PartForm>) => void;
  points: number;
  defaultMemberIds: string[];
  savedReviewerId: string | null;
  ctx: EditorContext;
}) {
  const memberIds = form.memberIds ?? defaultMemberIds;
  const reviewerId =
    form.reviewerId === undefined ? savedReviewerId : form.reviewerId;

  const toggleMember = (member: AssignableMember) =>
    onChange({
      memberIds: memberIds.includes(member.member_id)
        ? memberIds.filter((id) => id !== member.member_id)
        : [...memberIds, member.member_id],
    });

  const toggleSecondary = (skill: Skill) =>
    onChange({
      secondary_skills: form.secondary_skills.includes(skill)
        ? form.secondary_skills.filter((s) => s !== skill)
        : [...form.secondary_skills, skill],
    });

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-5 rounded-xl border p-4",
        highlight
          ? "border-(--maroon) bg-input/60"
          : "border-neutral-200 bg-white dark:border-input dark:bg-input/30",
      )}
    >
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {heading}
        </p>
        <p className="text-sm font-semibold text-foreground">{ownerName}</p>
        <p className="mt-1 text-xs text-muted-foreground">{note}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-name`}>
          Name <Required />
        </Label>
        <Input
          id={`${idPrefix}-name`}
          placeholder="e.g. Set up auth routes"
          value={form.title}
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-description`}>
          Description <Required />
        </Label>
        <Textarea
          id={`${idPrefix}-description`}
          rows={4}
          placeholder="What does this involve? Be as descriptive as possible"
          value={form.description}
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </div>

      <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
        <div className="min-w-0 space-y-2">
          <Label>Priority</Label>
          <Select
            value={form.priority}
            onValueChange={(value) =>
              onChange({ priority: value as TaskPriority })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: option.color }}
                    />
                    {option.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-0 space-y-2">
          <Label>Supertask</Label>
          <SupertaskSelect
            supertasks={ctx.supertasks}
            value={form.supertask_id}
            loading={ctx.supertasksLoading}
            error={ctx.supertasksError}
            onChange={(id) => onChange({ supertask_id: id })}
          />
        </div>

        <div className="min-w-0 space-y-2">
          <Label>
            Primary Skill <Required />
          </Label>
          <PrimarySkillSelect
            value={form.primary_skill}
            excluded={form.secondary_skills}
            onChange={(skill) =>
              onChange({
                primary_skill: skill,
                secondary_skills: form.secondary_skills.filter(
                  (s) => s !== skill,
                ),
              })
            }
          />
        </div>

        <div className="min-w-0 space-y-2">
          <Label>
            Secondary Skills <Required />
          </Label>
          <SecondarySkillSelect
            value={form.secondary_skills}
            primary={form.primary_skill}
            onToggle={toggleSecondary}
          />
        </div>

        <div className="min-w-0 space-y-2">
          <Label className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Assigned Members <Required />
          </Label>
          <MemberMultiSelect
            options={ctx.assignableMembers}
            selectedIds={memberIds}
            loading={ctx.membersLoading}
            error={ctx.membersError}
            onToggle={toggleMember}
          />
        </div>

        <div className="min-w-0 space-y-2">
          <Label className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Assigned Reviewer
          </Label>
          <ReviewerSelect
            options={ctx.eligibleReviewers}
            selectedId={reviewerId}
            loading={ctx.membersLoading}
            error={ctx.membersError}
            onToggle={(member) =>
              onChange({
                reviewerId:
                  reviewerId === member.member_id ? null : member.member_id,
              })
            }
          />
        </div>

        <div className="min-w-0 space-y-2">
          <Label>
            Deadline <Required />
          </Label>
          <DeadlineField
            value={form.deadline}
            today={ctx.today}
            onChange={(deadline) => onChange({ deadline })}
          />
        </div>

        <div className="min-w-0 space-y-2">
          <Label>Complexity</Label>
          <div className="flex h-9 items-center gap-2 rounded-md border bg-muted/30 px-3 text-sm">
            <ComplexityBadge complexity={complexityOf(points)} />
            <span className="text-xs text-muted-foreground">
              {points} pt{points === 1 ? "" : "s"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Set by the split, so the workload math stays accurate.
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The dialog
// ---------------------------------------------------------------------------

export interface SplitTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: RecommendationResponse;
  projectId: string;
  /** Called after the split was applied, so the page can refresh. */
  onApplied?: () => void;
}

export function SplitTaskDialog({
  open,
  onOpenChange,
  item,
  projectId,
  onApplied,
}: SplitTaskDialogProps) {
  const split = item.split;
  const [isApplying, setIsApplying] = useState(false);

  const [donorForm, setDonorForm] = useState<PartForm | null>(null);
  const [recipientForm, setRecipientForm] = useState<PartForm | null>(null);

  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();

  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const createAssignedMemberMutation = useCreateAssignedMember();
  const deleteAssignedMemberMutation = useDeleteAssignedMember();
  const createAssignedReviewerMutation = useCreateAssignedReviewer();
  const updateAssignedReviewerMutation = useUpdateAssignedReviewer();
  const deleteAssignedReviewerMutation = useDeleteAssignedReviewer();

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const originalTaskId = item.task_id ? String(item.task_id) : "";

  // Data the forms need (same sources as the Add / Edit task components)
  const {
    data: projectMembersData,
    isLoading: membersLoading,
    isError: membersError,
  } = useGetMembersWithUserInfo(open ? projectId : "");
  const {
    data: projectSupertasks = [],
    isLoading: supertasksLoading,
    isError: supertasksError,
  } = useGetAllProjectSupertasks(open ? projectId : "");
  const { data: allAssignedMembers, isLoading: assignedLoading } =
    useGetAllAssignedMembers();
  const { data: taskReviewers = [], isLoading: reviewerLoading } =
    useGetTaskReviewers(open ? originalTaskId : "");

  const assignableMembers: AssignableMember[] = useMemo(
    () =>
      (projectMembersData ?? [])
        .filter(
          (m) =>
            (m.project_role === "member" || m.project_role === "leader") &&
            m.users,
        )
        .map((m) => ({
          member_id: m.id.toString(),
          id: String(m.user_id),
          first_name: m.users.first_name,
          last_name: m.users.last_name,
        })),
    [projectMembersData],
  );

  const eligibleReviewers: AssignableMember[] = useMemo(
    () =>
      (projectMembersData ?? [])
        .filter(
          (m) =>
            (m.project_role === "leader" ||
              m.project_role === "advisor" ||
              m.project_role === "instructor") &&
            m.users,
        )
        .map((m) => ({
          member_id: m.id.toString(),
          id: String(m.user_id),
          first_name: m.users.first_name,
          last_name: m.users.last_name,
        })),
    [projectMembersData],
  );

  // What is saved right now for the original task
  const taskAssignmentRows = useMemo(
    () =>
      (allAssignedMembers ?? []).filter(
        (row) => String(row.task_id) === originalTaskId,
      ),
    [allAssignedMembers, originalTaskId],
  );
  const donorDefaultIds = useMemo(
    () => taskAssignmentRows.map((row) => String(row.member_id)),
    [taskAssignmentRows],
  );

  // The recipient starts as the assignee of the new task. Resolved against the
  // loaded members (matching either the project_members id or the user id), so
  // it never depends on members having loaded before the form was filled.
  const recipientDefaultIds = useMemo(() => {
    if (!item.to_member_id) return [];
    const raw = String(item.to_member_id);
    const match = assignableMembers.find(
      (m) => m.member_id === raw || m.id === raw,
    );
    return match ? [match.member_id] : [];
  }, [item.to_member_id, assignableMembers]);

  const dbReviewerRow = taskReviewers[0];
  const savedReviewerId = dbReviewerRow
    ? String(dbReviewerRow.member_id)
    : null;

  // Fill both forms from the AI's split whenever the dialog opens.
  // `item` is deliberately not a dependency so a background refetch
  // doesn't wipe in-progress edits.
  useEffect(() => {
    if (!open || !split) return;

    const base = {
      priority: (split.priority ?? "medium") as TaskPriority,
      supertask_id:
        split.supertask_id != null ? String(split.supertask_id) : null,
      deadline: item.current_deadline
        ? String(item.current_deadline).slice(0, 10)
        : "",
    };

    setDonorForm(formFromPart(split.donor_part, base));
    setRecipientForm(formFromPart(split.recipient_part, base));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item.id]);

  // Don't keep stale forms around once the dialog closes.
  useEffect(() => {
    if (open) return;
    setDonorForm(null);
    setRecipientForm(null);
  }, [open]);

  const ctx: EditorContext = {
    assignableMembers,
    eligibleReviewers,
    supertasks: projectSupertasks,
    membersLoading,
    membersError,
    supertasksLoading,
    supertasksError,
    today,
  };

  const patchDonor = (patch: Partial<PartForm>) =>
    setDonorForm((prev) => (prev ? { ...prev, ...patch } : prev));
  const patchRecipient = (patch: Partial<PartForm>) =>
    setRecipientForm((prev) => (prev ? { ...prev, ...patch } : prev));

  const handleApply = async () => {
    if (!split || !donorForm || !recipientForm) return;

    if (!user?.id) {
      toast.error(
        "Could not determine the current user. Please sign in again.",
      );
      return;
    }
    if (!originalTaskId) {
      toast.error(
        "The original task no longer exists. Click Generate for fresh suggestions.",
      );
      return;
    }

    const donorIds = donorForm.memberIds ?? donorDefaultIds;
    const recipientIds = recipientForm.memberIds ?? recipientDefaultIds;

    const problem =
      validatePart("Original task", donorForm, donorIds) ??
      validatePart("New task", recipientForm, recipientIds);
    if (problem) {
      toast.error(problem);
      return;
    }

    const donorReviewerId =
      donorForm.reviewerId === undefined
        ? savedReviewerId
        : donorForm.reviewerId;
    const recipientReviewerId =
      recipientForm.reviewerId === undefined
        ? savedReviewerId
        : recipientForm.reviewerId;

    setIsApplying(true);

    let stage = "creating the new task";
    let newTaskCreated = false;
    const warnings: string[] = [];

    try {
      // 1. The recipient's part becomes a NEW task, created like AddTaskDialog does.
      const payload: CreateTaskPayload = {
        project_id: projectId,
        name: recipientForm.title.trim(),
        description: recipientForm.description.trim(),
        created_by: user.id,
        priority: recipientForm.priority,
        category: categoryOf(
          recipientForm.primary_skill,
          split.recipient_part.category,
        ) as CreateTaskPayload["category"],
        complexity: complexityOf(
          split.recipient_part.complexity_points,
        ) as CreateTaskPayload["complexity"],
        complexity_points: split.recipient_part.complexity_points,
        deadline: recipientForm.deadline,
        primary_skill: recipientForm.primary_skill as Skill,
        secondary_skills: recipientForm.secondary_skills,
        supertask_id: recipientForm.supertask_id ?? undefined,
      };

      const createdTask = await createTaskMutation.mutateAsync(payload);
      newTaskCreated = true;

      stage = "assigning the new task";
      const [memberResults, reviewerResults] = await Promise.all([
        Promise.allSettled(
          recipientIds.map((memberId) =>
            createAssignedMemberMutation.mutateAsync({
              projectId,
              member: { member_id: memberId, task_id: createdTask.id },
            }),
          ),
        ),
        recipientReviewerId
          ? Promise.allSettled([
              createAssignedReviewerMutation.mutateAsync({
                member_id: recipientReviewerId,
                task_id: String(createdTask.id),
              }),
            ])
          : Promise.resolve([] as PromiseSettledResult<unknown>[]),
      ]);

      const failedMembers = memberResults.filter(
        (r) => r.status === "rejected",
      ).length;
      if (failedMembers > 0)
        warnings.push(
          `${failedMembers} member assignment(s) failed on the new task`,
        );
      if (reviewerResults.some((r) => r.status === "rejected"))
        warnings.push("the reviewer couldn't be set on the new task");

      // 2. The ORIGINAL task is updated into the donor's part, like EditTaskDialog does.
      stage = "updating the original task";
      const update = {
        name: donorForm.title.trim(),
        description: donorForm.description.trim(),
        priority: donorForm.priority,
        category: categoryOf(
          donorForm.primary_skill,
          split.donor_part.category,
        ),
        complexity: complexityOf(split.donor_part.complexity_points),
        complexity_points: split.donor_part.complexity_points,
        deadline: donorForm.deadline,
        primary_skill: donorForm.primary_skill,
        secondary_skills: donorForm.secondary_skills,
        supertask_id: donorForm.supertask_id,
      } as unknown as UpdateTask;

      await updateTaskMutation.mutateAsync({
        id: originalTaskId,
        task: update,
      });

      // 3. Sync the original's members and reviewer (same diffing as EditTaskDialog).
      const originalIds = new Set(
        taskAssignmentRows.map((row) => String(row.member_id)),
      );
      const keepIds = new Set(donorIds);
      const toAdd = donorIds.filter((id) => !originalIds.has(id));
      const toRemove = taskAssignmentRows.filter(
        (row) => !keepIds.has(String(row.member_id)),
      );

      if (toAdd.length > 0 || toRemove.length > 0) {
        try {
          await Promise.all([
            ...toAdd.map((memberId) =>
              createAssignedMemberMutation.mutateAsync({
                projectId,
                member: { member_id: memberId, task_id: originalTaskId },
              }),
            ),
            ...toRemove.map((row) =>
              deleteAssignedMemberMutation.mutateAsync({
                projectId,
                id: row.id,
              }),
            ),
          ]);
        } catch (syncErr) {
          console.error("Failed to sync original task members", syncErr);
          warnings.push("the original task's members couldn't be synced");
        }
      }

      if (donorReviewerId !== savedReviewerId) {
        try {
          if (dbReviewerRow && donorReviewerId) {
            await updateAssignedReviewerMutation.mutateAsync({
              id: dbReviewerRow.id,
              assignedReviewer: { member_id: donorReviewerId },
            });
          } else if (dbReviewerRow) {
            await deleteAssignedReviewerMutation.mutateAsync(dbReviewerRow.id);
          } else if (donorReviewerId) {
            await createAssignedReviewerMutation.mutateAsync({
              member_id: donorReviewerId,
              task_id: originalTaskId,
            });
          }
        } catch (reviewerErr) {
          console.error("Failed to sync original task reviewer", reviewerErr);
          warnings.push("the original task's reviewer couldn't be synced");
        }
      }

      queryClient.invalidateQueries({
        queryKey: taskKeys.listProject(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: taskKeys.assignedMembers(projectId),
      });
      queryClient.invalidateQueries({ queryKey: assignedMemberKeys.list() });
      queryClient.invalidateQueries({
        queryKey: assignedMemberKeys.task_list(originalTaskId),
      });
      queryClient.invalidateQueries({
        queryKey: projectKeys.detailSnapshot(projectId),
      });

      if (warnings.length > 0) {
        toast.warning(
          `Task split, but ${warnings.join("; ")}. You can fix these from the task page.`,
        );
      } else {
        toast.success(
          "Task split. The original keeps its part and a new task was created.",
        );
      }

      onApplied?.();
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to apply split", err);

      queryClient.invalidateQueries({
        queryKey: taskKeys.listProject(projectId),
      });

      toast.error(
        `Failed while ${stage}: ${errorMessage(err, "unknown error")}. ` +
          (newTaskCreated
            ? "The new task was already created, so check the task list before trying again."
            : "Nothing was changed."),
      );
    } finally {
      setIsApplying(false);
    }
  };

  const loadingData = membersLoading || assignedLoading || reviewerLoading;

  console.log({
    hasSplit: !!split,
    donorForm: !!donorForm,
    recipientForm: !!recipientForm,
    isApplying,
    membersLoading,
    assignedLoading,
    reviewerLoading,
    originalTaskId,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden bg-popover p-0 sm:max-w-6xl">
        <DialogHeader className="shrink-0 border-b px-6 py-5">
          <DialogTitle>
            Split task
            {split?.task_name ? `: ${split.task_name}` : ""}
          </DialogTitle>

          <DialogDescription>
            The original task is narrowed to one part, and the other part
            becomes a new task. Review and edit both before applying.
          </DialogDescription>
        </DialogHeader>

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-6 py-6">
          {!split ? (
            <div className="flex items-start gap-2 rounded-lg border border-yellow-500/50 bg-yellow-50 p-3 dark:bg-yellow-500/10">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600 dark:text-yellow-500" />
              <p className="text-sm text-yellow-900 dark:text-yellow-500">
                This suggestion has no split details. It was probably generated
                before AI splitting was added. Click Generate again to refresh
                it.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#C9A84C]" />
                <p className="text-sm text-foreground">
                  <span className="font-semibold">Why this split: </span>
                  {split.split_rationale}
                </p>
              </div>

              {donorForm && recipientForm && (
                <div className="grid items-start gap-4 lg:grid-cols-2">
                  <PartEditor
                    idPrefix="split-original"
                    heading="Original task · stays with"
                    ownerName={item.from_member_name ?? ""}
                    note="This task is updated to the part below."
                    form={donorForm}
                    onChange={patchDonor}
                    points={split.donor_part.complexity_points}
                    defaultMemberIds={donorDefaultIds}
                    savedReviewerId={savedReviewerId}
                    ctx={ctx}
                  />

                  <PartEditor
                    idPrefix="split-new"
                    heading="New task · goes to"
                    ownerName={item.to_member_name ?? "Recipient"}
                    note="A new task is created from the part below."
                    highlight
                    form={recipientForm}
                    onChange={patchRecipient}
                    points={split.recipient_part.complexity_points}
                    defaultMemberIds={recipientDefaultIds}
                    savedReviewerId={savedReviewerId}
                    ctx={ctx}
                  />
                </div>
              )}

              <div className="rounded-md bg-muted/50 p-3 text-xs">
                <p className="font-medium uppercase tracking-wide text-muted-foreground">
                  Workload after (from the AI's plan)
                </p>
                <p className="mt-0.5 text-card-foreground">
                  {item.expected_workload_after}
                </p>
                <p className="mt-1 text-muted-foreground">
                  If you change who is assigned, the workload is recalculated
                  after you apply.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t bg-muted/40 px-6 py-2 pb-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isApplying}
          >
            Close
          </Button>

          <Button
            onClick={handleApply}
            disabled={
              !split ||
              !donorForm ||
              !recipientForm ||
              isApplying ||
              loadingData
            }
          >
            {isApplying ? "Applying..." : "Apply split"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
