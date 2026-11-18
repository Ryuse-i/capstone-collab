import { createContext } from "react";
import type { OnboardingTourId } from "@/lib/onboarding";

export interface TourRequest {
  userId: string;
  tourId: OnboardingTourId;
}

export interface OnboardingTourContextValue {
  pendingTour: TourRequest | null;
  requestTour: (userId: string, tourId: OnboardingTourId) => void;
  clearPendingTour: () => void;
  startTour: (userId: string, tourId: OnboardingTourId) => boolean;
}

export const OnboardingTourContext =
  createContext<OnboardingTourContextValue | null>(null);
