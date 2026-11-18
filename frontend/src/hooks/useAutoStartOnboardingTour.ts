import { useEffect, useRef } from "react";
import {
  getTourOutcome,
  isNewUserForOnboarding,
  type OnboardingTourId,
} from "@/lib/onboarding";
import { useOnboardingTour } from "@/hooks/useOnboardingTour";

export function useAutoStartOnboardingTour(
  userId: string | undefined,
  tourId: OnboardingTourId,
  ready: boolean,
) {
  const { pendingTour, clearPendingTour, startTour } = useOnboardingTour();
  const startedAutomatically = useRef<string | null>(null);

  useEffect(() => {
    if (!userId || !ready) return;

    if (pendingTour?.userId === userId && pendingTour.tourId === tourId) {
      clearPendingTour();
      startTour(userId, tourId);
      return;
    }

    if (
      !isNewUserForOnboarding(userId) ||
      getTourOutcome(userId, tourId)
    ) {
      return;
    }

    const attemptKey = `${userId}:${tourId}`;
    if (startedAutomatically.current === attemptKey) return;
    startedAutomatically.current = attemptKey;

    if (!startTour(userId, tourId)) {
      startedAutomatically.current = null;
    }
  }, [
    clearPendingTour,
    pendingTour,
    ready,
    startTour,
    tourId,
    userId,
  ]);
}
