import type { Skill } from "@/types/project_member";

export const SECONDARY_MATCH_RATIO = 0.7;

/** How many of the secondary skills a member must have (70%, rounded). */
export function requiredSecondaryCount(secondaryCount: number): number {
  return Math.round(secondaryCount * SECONDARY_MATCH_RATIO);
}

/**
 * Eligible = has the primary skill AND at least 70% (rounded) of the
 * secondary skills. With no primary or no secondary skills selected,
 * nobody is eligible.
 */
export function isMemberEligible(
  memberSkills: Skill[] | null | undefined,
  primary: Skill | "",
  secondary: Skill[],
): boolean {
  if (!primary || secondary.length === 0) return false;

  const owned = new Set(memberSkills ?? []);
  if (!owned.has(primary)) return false;

  const matched = secondary.filter((s) => owned.has(s)).length;
  return matched >= requiredSecondaryCount(secondary.length);
}