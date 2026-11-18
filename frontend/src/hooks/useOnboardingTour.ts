import { useContext } from "react";
import {
  OnboardingTourContext,
  type OnboardingTourContextValue,
} from "@/components/onboarding/OnboardingTourContext";

export function useOnboardingTour(): OnboardingTourContextValue {
  const context = useContext(OnboardingTourContext);
  if (!context) {
    throw new Error(
      "useOnboardingTour must be used within OnboardingTourProvider",
    );
  }
  return context;
}
