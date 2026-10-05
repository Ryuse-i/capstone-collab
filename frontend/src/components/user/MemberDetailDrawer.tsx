import { useEffect, useState, type ReactNode } from "react";
import {
  Mail,
  Gauge,
  AlertTriangle,
  ShieldAlert,
  Wrench,
  PenLineIcon,
  Pencil,
  Check,
  X,
} from "lucide-react";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useUpdateMember } from "@/hooks/useProjectMember"; // <-- adjust to your hooks file path
import { useUpdateMemberCapacity } from "@/hooks/useMemberSnapshot";

import type {
  ProjectMemberUserSnapshot,
  ProjectRole,
  Skill,
} from "@/types/project_member";
import type { MemberStatus } from "@/types/member_snapshot";

type WorkloadStyle = { label: string; badge: string; bar: string };

// Mirrors the styles defined in Team.tsx. If you tweak the palette there,
// mirror it here too (or better: hoist both copies into a shared
// `memberStyles.ts` and import from both files).
const roleStyles: Record<ProjectRole, string> = {
  admin: "border-purple-400 text-purple-600 bg-purple-50 dark:bg-purple-950/20",
  advisor: "border-blue-400 text-blue-600 bg-blue-50 dark:bg-blue-950/20",
  instructor:
    "border-indigo-400 text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20",
  leader:
    "border-orange-400 text-orange-600 bg-orange-50 dark:bg-orange-950/20",
  member: "border-gray-400 text-gray-600 bg-gray-50 dark:bg-gray-800/40",
};

const workloadStyles: Record<MemberStatus, WorkloadStyle> = {
  overloaded: {
    label: "Overloaded",
    badge: "border-red-400 text-red-500 bg-red-50 dark:bg-red-950/20",
    bar: "bg-red-500",
  },
  underutilized: {
    label: "Underutilized",
    badge:
      "border-yellow-400 text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20",
    bar: "bg-yellow-400",
  },
  normal: {
    label: "Normal",
    badge: "border-green-400 text-green-600 bg-green-50 dark:bg-green-950/20",
    bar: "bg-green-500",
  },
};

// `Skill` is only a type, so we need a runtime list of options to render
// the picker. Grouped by category to keep the editor easy to scan.
const SKILL_GROUPS: { label: string; skills: Skill[] }[] = [
  {
    label: "Development",
    skills: [
      "Backend Development",
      "Frontend Development",
      "Mobile Development",
      "IOT Development",
      "Database Design",
      "System Architecture",
      "UI/UX Design",
      "Testing and Quality Assurance",
    ],
  },
  {
    label: "Research",
    skills: [
      "Literature Review",
      "Data Collection",
      "Survey and Questionnaire Design",
      "Interview and Observation",
      "Data Analysis",
    ],
  },
  {
    label: "Writing & Documentation",
    skills: [
      "Technical Writing",
      "Documentation",
      "Diagram and Modeling",
      "Editing and Proofreading",
    ],
  },
  {
    label: "Management",
    skills: [
      "Financial Documentation",
      "Budget Planning",
      "Resource Management",
    ],
  },
];

function getInitials(first: string, last: string) {
  return `${first?.trim()?.[0] ?? ""}${last?.trim()?.[0] ?? ""}`.toUpperCase();
}

function capacityPercent(multiplier: number) {
  return Math.min(Math.max(multiplier * 100, 0), 200) / 2;
}

export interface MemberDetailDrawerProps {
  member: ProjectMemberUserSnapshot;
  trigger?: ReactNode;
  /**
   * Optional override. By default the drawer saves skills itself via
   * `useUpdateMember` (PATCH /project_members/:id with `{ skills }`).
   * Only pass this if you want custom save behavior. Throw on failure so
   * the drawer can show an error and stay in edit mode.
   */
  onSaveSkills?: (memberId: string, skills: Skill[]) => Promise<void> | void;
}

export default function MemberDetailDrawer({
  member,
  trigger,
  onSaveSkills,
}: MemberDetailDrawerProps) {
  const [open, setOpen] = useState(false);
  const updateMember = useUpdateMember();

  const { user, project_role } = member;
  const snapshot = member.snapshots[0];

  // Skills editing state
  const [currentSkills, setCurrentSkills] = useState<Skill[]>(
    member.skills ?? [],
  );
  const [isEditingSkills, setIsEditingSkills] = useState(false);
  const [draftSkills, setDraftSkills] = useState<Skill[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isEditingCapacity, setIsEditingCapacity] = useState(false);
  const [draftCapacity, setDraftCapacity] = useState("");
  const [isSavingCapacity, setIsSavingCapacity] = useState(false);
  const [capacitySaveError, setCapacitySaveError] = useState<string | null>(
    null,
  );
  const updateMemberCapacity = useUpdateMemberCapacity();

  // Keep the displayed skills in sync if the parent refetches the member.
  useEffect(() => {
    if (!isEditingSkills) {
      setCurrentSkills(member.skills ?? []);
    }
  }, [member.skills, isEditingSkills]);

  const points =
    snapshot !== undefined
      ? parseFloat(snapshot.total_effective_points)
      : undefined;
  const capacity =
    snapshot !== undefined
      ? parseFloat(snapshot.capacity_multiplier)
      : undefined;

  const workload = workloadStyles[snapshot?.workload_status ?? "normal"];
  const initials = getInitials(user.first_name, user.last_name);

  const startEditingSkills = () => {
    setDraftSkills(currentSkills);
    setSaveError(null);
    setIsEditingSkills(true);
  };

  const cancelEditingSkills = () => {
    setDraftSkills([]);
    setSaveError(null);
    setIsEditingSkills(false);
  };

  const toggleSkill = (skill: Skill) => {
    setDraftSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    );
  };

  const saveSkills = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      if (onSaveSkills) {
        await onSaveSkills(member.id, draftSkills);
      } else {
        await updateMember.mutateAsync({
          id: member.id,
          member: { skills: draftSkills },
        });
      }
      setCurrentSkills(draftSkills);
      setIsEditingSkills(false);
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? err.message
          : "Failed to save skills. Try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const startEditingCapacity = () => {
    setDraftCapacity(String(capacity ?? 1));
    setCapacitySaveError(null);
    setIsEditingCapacity(true);
  };

  const cancelEditingCapacity = () => {
    setDraftCapacity("");
    setCapacitySaveError(null);
    setIsEditingCapacity(false);
  };

  const capacityDraftValue = Number(draftCapacity);
  const isCapacityDraftValid =
    draftCapacity.trim() !== "" &&
    Number.isFinite(capacityDraftValue) &&
    capacityDraftValue >= 0.5 &&
    capacityDraftValue <= 2;
  const hasCapacityChanges =
    isCapacityDraftValid && capacityDraftValue !== (capacity ?? 1);

  const saveCapacity = async () => {
    if (!isCapacityDraftValid) return;

    setIsSavingCapacity(true);
    setCapacitySaveError(null);
    try {
      await updateMemberCapacity.mutateAsync({
        memberId: member.id,
        snapshotId: snapshot?.id,
        capacityMultiplier: capacityDraftValue,
      });
      setIsEditingCapacity(false);
      setDraftCapacity("");
    } catch (err) {
      setCapacitySaveError(
        err instanceof Error
          ? err.message
          : "Failed to save capacity. Try again.",
      );
    } finally {
      setIsSavingCapacity(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      // Discard any unsaved edits when the drawer closes.
      setIsEditingSkills(false);
      setDraftSkills([]);
      setSaveError(null);
      setIsEditingCapacity(false);
      setDraftCapacity("");
      setCapacitySaveError(null);
    }
  };

  const hasChanges =
    draftSkills.length !== currentSkills.length ||
    draftSkills.some((s) => !currentSkills.includes(s));

  return (
    <Drawer open={open} onOpenChange={handleOpenChange} direction="right">
      <DrawerTrigger asChild>
        {trigger ?? (
          <button
            type="button"
            aria-label={`View ${user.first_name} ${user.last_name}`}
          >
            <PenLineIcon className="w-4 h-4" />
          </button>
        )}
      </DrawerTrigger>

      <DrawerContent className="ml-auto h-full w-full overflow-hidden rounded-none p-0 sm:max-w-md">
        <DrawerHeader className="shrink-0 border-b px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DrawerTitle>Member Details</DrawerTitle>
              <DrawerDescription className="mt-1">
                Skills and workload information for this member.
              </DrawerDescription>
            </div>

            <DrawerClose asChild>
              <button
                type="button"
                className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Close member details"
              >
                <X className="size-4" />
              </button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="custom-scrollbar overflow-y-auto px-6 py-6">
          <div className="space-y-6">
            {/* Identity */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 shrink-0 rounded-full border-2 border-gray-300 flex items-center justify-center bg-primary dark:bg-gray-800 dark:border-gray-600">
                <span className="text-sm font-bold text-primary-foreground dark:text-foreground">
                  {initials}
                </span>
              </div>
              <div className="flex flex-col gap-1 min-w-0">
                <span className="font-semibold text-card-foreground text-sm truncate">
                  {user.first_name.trim()} {user.last_name.trim()}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 truncate">
                  <Mail className="w-3 h-3 shrink-0" />
                  {user.email}
                </span>
                <span
                  className={`text-xs border rounded-full px-2 py-0.5 w-fit capitalize ${roleStyles[project_role]}`}
                >
                  {project_role}
                </span>
              </div>
            </div>

            {snapshot?.silence_warning && (
              <span className="flex items-center gap-1.5 text-xs font-semibold border border-red-400 text-red-500 bg-white dark:bg-red-950/10 rounded px-2 py-1.5 w-fit">
                <ShieldAlert className="w-3.5 h-3.5" />
                No recent activity reported
              </span>
            )}

            {/* Skills */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Wrench className="w-3.5 h-3.5" />
                  Skills
                </div>

                {!isEditingSkills && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs"
                    onClick={startEditingSkills}
                  >
                    <Pencil className="size-3" />
                    Edit
                  </Button>
                )}
              </div>

              {isEditingSkills ? (
                <div className="space-y-4">
                  <p className="text-xs text-gray-400">
                    Select the skills this member brings to the group.
                  </p>

                  {SKILL_GROUPS.map((group) => (
                    <div key={group.label} className="space-y-1.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                        {group.label}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {group.skills.map((skill) => {
                          const selected = draftSkills.includes(skill);
                          return (
                            <button
                              key={skill}
                              type="button"
                              role="checkbox"
                              aria-checked={selected}
                              disabled={isSaving}
                              onClick={() => toggleSkill(skill)}
                              className={`flex items-center gap-1 rounded-sm border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-60 ${
                                selected
                                  ? "border-[#7A0C2E] bg-[#7A0C2E] text-white"
                                  : "border-[#7A0C2E]/20 bg-[#FBF3E7] text-[#7A0C2E] hover:border-[#7A0C2E]/50"
                              }`}
                            >
                              {selected && <Check className="size-3" />}
                              {skill}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {saveError && (
                    <p className="text-xs text-red-500" role="alert">
                      {saveError}
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-xs text-gray-400">
                      {draftSkills.length} selected
                    </span>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={cancelEditingSkills}
                        disabled={isSaving}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={saveSkills}
                        disabled={isSaving || !hasChanges}
                      >
                        {isSaving ? "Saving..." : "Save skills"}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : currentSkills.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {currentSkills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-sm border border-[#7A0C2E]/20 bg-[#FBF3E7] px-2 py-0.5 text-xs font-medium text-[#7A0C2E]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">
                  No skills recorded for this member yet.
                </p>
              )}
            </div>

            {/* Workload status */}
            <div className="bg-gray-50 dark:bg-card-foreground/5 rounded-lg px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 dark:text-card-foreground">
                  Workload status
                </p>
                <p className="text-sm font-semibold text-gray-800 dark:text-card-foreground mt-0.5">
                  {workload.label}
                </p>
              </div>
              <span
                className={`text-xs font-bold border rounded px-2 py-1 ${workload.badge}`}
              >
                {workload.label.toUpperCase()}
              </span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 border-b pb-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1 text-blue-500">
                  <Gauge className="w-3.5 h-3.5" />
                  <span className="text-xs text-gray-400">Points</span>
                </div>
                <span className="text-2xl font-bold text-gray-800 dark:text-card-foreground">
                  {points !== undefined ? points : "—"}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1 text-gray-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span className="text-xs text-gray-400">Capacity</span>
                  {!isEditingCapacity && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      className="h-7 gap-1 px-2 text-xs"
                      onClick={startEditingCapacity}
                    >
                      <Pencil className="size-3" />
                      Edit
                    </Button>
                  )}
                </div>
                {isEditingCapacity ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0.5"
                        max="2"
                        step="0.01"
                        aria-label="Capacity multiplier"
                        value={draftCapacity}
                        onChange={(event) =>
                          setDraftCapacity(event.target.value)
                        }
                        disabled={isSavingCapacity}
                        className="h-9 w-28"
                      />
                      <span className="text-sm text-muted-foreground">x</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Enter a value from 0.5x to 2.0x.
                    </p>
                    {capacitySaveError && (
                      <p className="text-xs text-red-500" role="alert">
                        {capacitySaveError}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={cancelEditingCapacity}
                        disabled={isSavingCapacity}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={saveCapacity}
                        disabled={isSavingCapacity || !hasCapacityChanges}
                      >
                        {isSavingCapacity ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <span className="text-2xl font-bold text-gray-800 dark:text-card-foreground">
                    {capacity !== undefined ? `${capacity.toFixed(1)}x` : "—"}
                  </span>
                )}
              </div>
            </div>

            {/* Capacity multiplier bar */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-gray-500 dark:text-card-foreground">
                <span>Capacity multiplier</span>
                <span>
                  {capacity !== undefined
                    ? `${capacity.toFixed(2)}x`
                    : "No data"}
                </span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${workload.bar}`}
                  style={{
                    width: `${capacity !== undefined ? capacityPercent(capacity) : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <DrawerFooter className="shrink-0 gap-2 border-t bg-muted/40 px-6 py-3">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Close
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
