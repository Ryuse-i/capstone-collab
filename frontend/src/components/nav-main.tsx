"use client";

import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

type Pill = {
  top: number;
  left: number;
  width: number;
  height: number;
  visible: boolean;
};

// Remembered outside React so the pill can slide from its previous position
// even if the sidebar remounts on navigation (e.g. each page renders its own
// <AppLayout>).
let lastPill: Pill | null = null;

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: React.ReactNode;
    isActive?: boolean;
    // Extra route prefixes that should also count as "active" for this
    // item (e.g. a detail page reachable only by clicking into a list,
    // with no sidebar entry of its own).
    matchPrefixes?: string[];
    // When set, clicking this item navigates to whatever path this
    // returns (the last path remembered for this section) instead of
    // always going to `url`. Return null/undefined to fall back to `url`.
    getLastVisited?: () => string | null | undefined;
    items?: {
      title: string;
      url: string;
    }[];
  }[];
}) {
  // Re-read on every navigation so the link target and active state
  // stay in sync with whatever was last remembered.
  const { pathname } = useLocation();

  const containerRef = React.useRef<HTMLDivElement>(null);
  const [pill, setPill] = React.useState<Pill | null>(lastPill);

  // Measure the active button and move the pill to it. The first paint shows
  // the pill at its OLD position (lastPill); two animation frames later it is
  // moved to the new one, and the CSS transition does the sliding.
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const root =
        container.closest<HTMLElement>('[data-sidebar="content"]') ?? container;

      const active = root.querySelector<HTMLElement>(
        '[data-sidebar="menu-button"][data-active="true"]',
      );

      if (!active) {
        if (lastPill) {
          lastPill = { ...lastPill, visible: false };
          setPill(lastPill);
        }
        return;
      }

      const c = root.getBoundingClientRect();
      const a = active.getBoundingClientRect();
      lastPill = {
        top: a.top - c.top + root.scrollTop,
        left: a.left - c.left,
        width: a.width,
        height: a.height,
        visible: true,
      };
      setPill(lastPill);
    };

    let ro: ResizeObserver | undefined;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        measure();
        // Re-measure when the sidebar collapses/expands or resizes.
        ro = new ResizeObserver(measure);
        ro.observe(container.closest('[data-sidebar="content"]') ?? container);
      });
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      ro?.disconnect();
    };
  }, [pathname, items.length]);

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>

      <div ref={containerRef}>
        {/* Sliding highlight */}
        {pill && (
          <div
            aria-hidden
            className="pointer-events-none absolute z-0 rounded-md bg-sidebar-accent motion-reduce:transition-none"
            style={{
              top: pill.top,
              left: pill.left,
              width: pill.width,
              height: pill.height,
              opacity: pill.visible ? 1 : 0,
              transition:
                "top 320ms cubic-bezier(0.22, 1, 0.36, 1), left 320ms cubic-bezier(0.22, 1, 0.36, 1), width 320ms cubic-bezier(0.22, 1, 0.36, 1), height 320ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease",
            }}
          />
        )}

        <SidebarMenu>
          {items.map((item) => {
            const isActive =
              pathname === item.url ||
              (item.matchPrefixes?.some((prefix) =>
                pathname.startsWith(prefix),
              ) ??
                false);

            const linkTarget = item.getLastVisited?.() ?? item.url;

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  isActive={isActive}
                  // The pill draws the active background now, so the button
                  // itself stays transparent and sits above the pill.
                  className="relative z-10 data-[active=true]:bg-transparent"
                >
                  <Link to={linkTarget}>
                    {item.icon}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </div>
    </SidebarGroup>
  );
}
