import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { driver, type Driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import "@/styles/onboarding-tour.css";
import {
  saveTourOutcome,
  type OnboardingTourId,
} from "@/lib/onboarding";
import {
  OnboardingTourContext,
  type TourRequest,
} from "@/components/onboarding/OnboardingTourContext";

interface TourStep {
  path: string;
  element?: string;
  title: string;
  description: string;
}

const welcome = (description: string): TourStep => ({
  path: "/dashboard",
  title: "Welcome to PSU-Collab",
  description,
});

const tourSteps: Record<OnboardingTourId, TourStep[]> = {
  "student-no-project": [
    welcome("Create a project for your capstone or join one with an invite link."),
    {
      path: "/dashboard",
      element: '[data-tour="setup.create-project"]',
      title: "Create your project",
      description:
        "Create your own project here; the setup dialog guides you through its details and team.",
    },
    {
      path: "/dashboard",
      element: '[data-tour="setup.join-project"]',
      title: "Join an existing project",
      description:
        "Already have an invitation? Join a project with its invite link here.",
    },
  ],
  "student-leader": [
    welcome("I'll show you the main areas for organizing your project."),
    {
      path: "/dashboard",
      element: '[data-tour="leader.project-health"]',
      title: "Dashboard: project health",
      description:
        "Use health and task summaries to spot delivery risks and decide what needs attention.",
    },
    {
      path: "/dashboard",
      element: '[data-tour="leader.invite-link"]',
      title: "Dashboard: invite your team",
      description:
        "Create or copy an invitation link to bring classmates into this project.",
    },
    {
      path: "/project-task",
      element: '[data-tour="project-task.views"]',
      title: "Project Task: plan the work",
      description:
        "Review task status, switch between Board, Table, and Timeline, or add a project task.",
    },
    {
      path: "/project-task",
      element: '[data-tour="project-task.list"]',
      title: "Project Task: manage details",
      description:
        "Open a task to review its owner, priority, complexity, deadline, and status.",
    },
    {
      path: "/mytask",
      element: '[data-tour="my-tasks.filters"]',
      title: "My Tasks: filter your work",
      description:
        "Filter assigned tasks by status to focus on what is not started, in progress, or awaiting review.",
    },
    {
      path: "/mytask",
      element: '[data-tour="my-tasks.list"]',
      title: "My Tasks: open a task",
      description:
        "Open a task card to read its details and update its status as work progresses.",
    },
    {
      path: "/workload",
      element: '[data-tour="workload.summary"]',
      title: "Workload: review team balance",
      description:
        "Compare members' current points with expected capacity and check the project balance summary.",
    },
    {
      path: "/workload",
      element: '[data-tour="workload.recommendations"]',
      title: "Workload: consider suggestions",
      description:
        "Generate and review redistribution suggestions; check the impact before applying one.",
    },
    {
      path: "/team",
      element: '[data-tour="team.roster"]',
      title: "Team: know your collaborators",
      description:
        "Review project members, their roles, and the contribution or workload information available.",
    },
    {
      path: "/chat",
      element: '[data-tour="chat.composer"]',
      title: "Chat: coordinate together",
      description:
        "Read project messages and use the composer to send updates; Enter sends and Shift+Enter adds a line.",
    },
    {
      path: "/resources",
      element: '[data-tour="resources.overview"]',
      title: "Resources: share project materials",
      description:
        "Browse shared links and files, filter by category, and open a resource for its details.",
    },
    {
      path: "/capstone-repository",
      element: '[data-tour="repository.search"]',
      title: "Capstone Repository: find examples",
      description:
        "Search past capstone papers by topic or title, then open a result to read more.",
    },
  ],
  "student-member": [
    welcome("I'll show you where to check your project and find your work."),
    {
      path: "/dashboard",
      element: '[data-tour="member.dashboard-summary"]',
      title: "Dashboard: your project at a glance",
      description:
        "Check assigned work, task progress, deadlines, and the team overview from this page.",
    },
    {
      path: "/mytask",
      element: '[data-tour="my-tasks.filters"]',
      title: "My Tasks: find the next task",
      description:
        "Filter your assigned tasks by status to see what to start, continue, or submit for review.",
    },
    {
      path: "/mytask",
      element: '[data-tour="my-tasks.list"]',
      title: "My Tasks: review task details",
      description:
        "Open a task card to read its description, deadline, priority, and current status.",
    },
    {
      path: "/team",
      element: '[data-tour="team.roster"]',
      title: "Team: meet your collaborators",
      description:
        "See the project team and the role and contribution information available to you.",
    },
    {
      path: "/chat",
      element: '[data-tour="chat.composer"]',
      title: "Chat: stay in touch",
      description:
        "Read project messages and use the composer to send updates; Enter sends and Shift+Enter adds a line.",
    },
    {
      path: "/resources",
      element: '[data-tour="resources.overview"]',
      title: "Resources: find shared materials",
      description:
        "Browse project links and files, filter by category, and open a resource to view its details.",
    },
    {
      path: "/capstone-repository",
      element: '[data-tour="repository.search"]',
      title: "Capstone Repository: explore examples",
      description:
        "Search previous capstone papers by topic or title, then open a result for more information.",
    },
  ],
  instructor: [
    welcome("I'll show you where to monitor projects and support your students."),
    {
      path: "/dashboard",
      element: '[data-tour="instructor.dashboard-summary"]',
      title: "Dashboard: monitor your portfolio",
      description:
        "Review project health, pending submissions, and upcoming deadlines to prioritize follow-up.",
    },
    {
      path: "/project-list",
      element: '[data-tour="instructor.projects"]',
      title: "Projects: open a project",
      description:
        "Browse projects assigned to you and open one to review its details.",
    },
    {
      path: "/chat",
      element: '[data-tour="chat.project-context"]',
      title: "Chat: project conversation",
      description:
        "The project name at the top identifies the conversation you are viewing.",
    },
    {
      path: "/chat",
      element: '[data-tour="chat.composer"]',
      title: "Chat: communicate with the team",
      description:
        "Read project messages and use the composer to send updates; Enter sends and Shift+Enter adds a line.",
    },
    {
      path: "/capstone-repository",
      element: '[data-tour="repository.search"]',
      title: "Capstone Repository: find references",
      description:
        "Search past capstone papers by topic or title, then open a result to review its details.",
    },
  ],
};

interface ActiveTour {
  userId: string;
  tourId: OnboardingTourId;
}

interface PendingNavigation {
  index: number;
  path: string;
  token: object;
}

function isVisible(element: Element): boolean {
  const style = window.getComputedStyle(element);
  return (
    element.getClientRects().length > 0 &&
    style.display !== "none" &&
    style.visibility !== "hidden"
  );
}

export function OnboardingTourProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const driverRef = useRef<Driver | null>(null);
  const driverTokenRef = useRef<object | null>(null);
  const transitionRef = useRef(false);
  const pendingNavigationRef = useRef<PendingNavigation | null>(null);
  const activeTourRef = useRef<ActiveTour | null>(null);
  const targetWaitCleanupRef = useRef<(() => void) | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const lastFocusableTargetRef = useRef<HTMLElement | null>(null);
  const [pendingTour, setPendingTour] = useState<TourRequest | null>(null);
  const [activeTour, setActiveTour] = useState<ActiveTour | null>(null);

  const setActive = useCallback((next: ActiveTour | null) => {
    activeTourRef.current = next;
    setActiveTour(next);
  }, []);

  const clearPendingTour = useCallback(() => setPendingTour(null), []);

  const restoreFocus = useCallback(() => {
    const previousFocus =
      previousFocusRef.current?.isConnected &&
      previousFocusRef.current !== document.body
        ? previousFocusRef.current
        : lastFocusableTargetRef.current;
    previousFocusRef.current = null;
    lastFocusableTargetRef.current = null;
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  }, []);

  const requestTour = useCallback(
    (userId: string, tourId: OnboardingTourId) => {
      setPendingTour({ userId, tourId });
    },
    [],
  );

  const finishTour = useCallback(
    (outcome: "completed" | "skipped") => {
      const current = activeTourRef.current;
      if (!current) return;
      saveTourOutcome(current.userId, current.tourId, outcome);
      targetWaitCleanupRef.current?.();
      targetWaitCleanupRef.current = null;
      pendingNavigationRef.current = null;
      transitionRef.current = false;
      setActive(null);
      driverRef.current?.destroy();
      restoreFocus();
    },
    [restoreFocus, setActive],
  );

  const createDriver = useCallback(
    (tour: ActiveTour, token: object): Driver => {
      const steps: DriveStep[] = tourSteps[tour.tourId].map((step) => ({
        ...(step.element ? { element: step.element } : {}),
        popover: {
          title: step.title,
          description: step.description,
        },
      }));

      const move = (currentDriver: Driver, direction: -1 | 1) => {
        const index = currentDriver.getActiveIndex();
        if (index === undefined) return;

        const nextIndex = index + direction;
        const nextStep = tourSteps[tour.tourId][nextIndex];
        if (!nextStep) {
          finishTour(direction === 1 ? "completed" : "skipped");
          return;
        }

        if (nextStep.path === pathname) {
          if (direction === 1) currentDriver.moveNext();
          else currentDriver.movePrevious();
          return;
        }

        pendingNavigationRef.current = {
          index: nextIndex,
          path: nextStep.path,
          token,
        };
        transitionRef.current = true;
        currentDriver.destroy();
      };

      return driver({
        steps,
        animate: !window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches,
        smoothScroll: !window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches,
        duration: 220,
        overlayColor: "#19151b",
        overlayOpacity: 0.58,
        stagePadding: 8,
        stageRadius: 16,
        popoverOffset: 12,
        popoverClass: "psu-onboarding-popover",
        showProgress: true,
        progressText: "{{current}} of {{total}}",
        showButtons: ["previous", "next", "close"],
        nextBtnText: "Next",
        prevBtnText: "Back",
        doneBtnText: "Done",
        closeBtnLabel: "Skip tour",
        allowKeyboardControl: true,
        overlayClickBehavior: "none",
        onNextClick: (_element, _step, { driver: currentDriver }) => {
          move(currentDriver, 1);
        },
        onPrevClick: (_element, _step, { driver: currentDriver }) => {
          move(currentDriver, -1);
        },
        onDoneClick: () => finishTour("completed"),
        onCloseClick: () => finishTour("skipped"),
        onDestroyStarted: (_element, _step, { reason, driver: currentDriver }) => {
          if (!transitionRef.current) {
            const current = activeTourRef.current;
            if (current) {
              saveTourOutcome(
                current.userId,
                current.tourId,
                reason === "done" ? "completed" : "skipped",
              );
              setActive(null);
              restoreFocus();
            }
          }
          currentDriver.destroy();
        },
        onDestroyed: () => {
          if (driverTokenRef.current !== token) return;
          driverRef.current = null;
          driverTokenRef.current = null;

          const pendingNavigation = pendingNavigationRef.current;
          if (!pendingNavigation || pendingNavigation.token !== token) return;

          navigate(pendingNavigation.path);
        },
      });
    },
    [finishTour, navigate, pathname, restoreFocus, setActive],
  );

  const activateStep = useCallback(
    (tour: ActiveTour, index: number) => {
      function activateIndex(stepIndex: number): void {
        const step = tourSteps[tour.tourId][stepIndex];
        if (!step || pathname !== step.path) return;

        const start = () => {
          if (activeTourRef.current?.tourId !== tour.tourId) return;
          const target = step.element
            ? document.querySelector(step.element)
            : null;
          if (
            target instanceof HTMLElement &&
            target.matches(
              'button, a[href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
            )
          ) {
            lastFocusableTargetRef.current = target;
          }
          const token = {};
          const activeDriver = createDriver(tour, token);
          driverTokenRef.current = token;
          driverRef.current = activeDriver;
          activeDriver.drive(stepIndex);
        };

        if (!step.element) {
          start();
          return;
        }

        const startedAt = Date.now();
        let timeoutId = 0;

        function cleanup(): void {
          window.clearTimeout(timeoutId);
          observer.disconnect();
          if (targetWaitCleanupRef.current === cleanup) {
            targetWaitCleanupRef.current = null;
          }
        }

        const checkTarget = () => {
          const target = document.querySelector(step.element!);
          if (target && isVisible(target)) {
            cleanup();
            start();
            return;
          }

          if (Date.now() - startedAt >= 4000) {
            cleanup();
            const nextIndex = stepIndex + 1;
            if (nextIndex >= tourSteps[tour.tourId].length) {
              setActive(tour);
              finishTour("completed");
              return;
            }
            const nextStep = tourSteps[tour.tourId][nextIndex];
            setActive(tour);
            if (nextStep.path === pathname) {
              activateIndex(nextIndex);
            } else {
              pendingNavigationRef.current = {
                index: nextIndex,
                path: nextStep.path,
                token: {},
              };
              navigate(nextStep.path);
            }
          }
        };

        const observer = new MutationObserver(checkTarget);
        targetWaitCleanupRef.current?.();
        targetWaitCleanupRef.current = cleanup;
        observer.observe(document.body, { childList: true, subtree: true });
        timeoutId = window.setTimeout(checkTarget, 4000);
        checkTarget();
      };

      activateIndex(index);
    },
    [createDriver, finishTour, navigate, pathname, setActive],
  );

  const startTour = useCallback(
    (userId: string, tourId: OnboardingTourId): boolean => {
      if (pathname !== "/dashboard") return false;
      if (document.querySelector('[role="dialog"]:not(.driver-popover), dialog[open]')) {
        return false;
      }

      driverRef.current?.destroy();
      targetWaitCleanupRef.current?.();
      targetWaitCleanupRef.current = null;
      pendingNavigationRef.current = null;
      transitionRef.current = false;

      const tour = { userId, tourId };
      previousFocusRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      setActive(tour);
      activateStep(tour, 0);
      return true;
    },
    [activateStep, pathname, setActive],
  );

  useEffect(() => {
    const pending = pendingNavigationRef.current;
    if (!pending || pending.path !== pathname) return;
    const tour = activeTourRef.current;
    if (!tour) return;

    pendingNavigationRef.current = null;
    transitionRef.current = false;
    activateStep(tour, pending.index);
  }, [activateStep, pathname]);

  useEffect(() => {
    if (!activeTour) return;
    const stepIndex = driverRef.current?.getActiveIndex();
    const currentStep =
      stepIndex === undefined ? undefined : tourSteps[activeTour.tourId][stepIndex];
    if (
      currentStep &&
      currentStep.path !== pathname &&
      !pendingNavigationRef.current
    ) {
      finishTour("skipped");
    }
  }, [activeTour, finishTour, pathname]);

  useEffect(() => {
    if (!activeTour) return;

    const stopForDialog = () => {
      if (
        document.querySelector(
          '[role="dialog"]:not(.driver-popover), dialog[open]',
        )
      ) {
        finishTour("skipped");
      }
    };

    const observer = new MutationObserver(stopForDialog);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["aria-modal", "data-state", "open"],
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [activeTour, finishTour]);

  useEffect(
    () => () => {
      targetWaitCleanupRef.current?.();
      targetWaitCleanupRef.current = null;
      pendingNavigationRef.current = null;
      transitionRef.current = false;
      driverRef.current?.destroy();
      driverRef.current = null;
      driverTokenRef.current = null;
    },
    [],
  );

  return (
    <OnboardingTourContext.Provider
      value={{ pendingTour, requestTour, clearPendingTour, startTour }}
    >
      {children}
    </OnboardingTourContext.Provider>
  );
}
