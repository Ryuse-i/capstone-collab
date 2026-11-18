export const onboardingTourIds = [
  "student-no-project",
  "student-leader",
  "student-member",
  "instructor",
] as const;

export type OnboardingTourId = (typeof onboardingTourIds)[number];
export type TourOutcome = "completed" | "skipped";

const storagePrefix = "psu-collab:onboarding:v1:";
const newUserIds = new Set<string>();
const tourOutcomes = new Map<string, TourOutcome>();

function getStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function newUserKey(userId: string): string {
  return `${storagePrefix}${userId}:new-user`;
}

function tourKey(userId: string, tourId: OnboardingTourId): string {
  return `${storagePrefix}${userId}:${tourId}`;
}

export function markNewUserForOnboarding(userId: string): void {
  newUserIds.add(userId);
  try {
    getStorage()?.setItem(newUserKey(userId), "1");
  } catch {
    // The in-memory flag still supports this session when storage is blocked.
  }
}

export function isNewUserForOnboarding(userId: string): boolean {
  if (newUserIds.has(userId)) return true;
  try {
    return getStorage()?.getItem(newUserKey(userId)) === "1";
  } catch {
    return false;
  }
}

export function getTourOutcome(
  userId: string,
  tourId: OnboardingTourId,
): TourOutcome | null {
  const key = tourKey(userId, tourId);
  const inMemory = tourOutcomes.get(key);
  if (inMemory) return inMemory;
  try {
    const stored = getStorage()?.getItem(key);
    return stored === "completed" || stored === "skipped" ? stored : null;
  } catch {
    return null;
  }
}

export function saveTourOutcome(
  userId: string,
  tourId: OnboardingTourId,
  outcome: TourOutcome,
): void {
  const key = tourKey(userId, tourId);
  tourOutcomes.set(key, outcome);
  try {
    getStorage()?.setItem(key, outcome);
  } catch {
    // Keep the outcome for the current session when storage is blocked.
  }
}
