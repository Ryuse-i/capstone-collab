"use client";

import * as React from "react";
import { useLocation } from "react-router-dom";

/**
 * Wraps the routed page content and plays a slide-in animation whenever the
 * user switches to a different section (Dashboard -> Chat -> Settings, etc).
 *
 * The animation is keyed on the FIRST path segment only, so moving between
 * or /project-list -> /view-project/1) doesn't re-trigger it.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const section = pathname.split("/")[1] || "root";

  return (
    // overflow-x-clip prevents a horizontal scrollbar flashing during the slide.
    // flex classes mirror AppLayout's content container so pages that rely on
    // flex-1 / full height keep filling the space.
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-clip">
      <div
        key={section}
        className="page-slide-in flex min-h-0 min-w-0 flex-1 flex-col gap-4"
      >
        {children}
      </div>
    </div>
  );
}