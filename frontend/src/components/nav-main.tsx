"use client";

import { Link, useLocation } from "react-router-dom";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

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

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const isActive =
            pathname === item.url ||
            (item.matchPrefixes?.some((prefix) =>
              pathname.startsWith(prefix)
            ) ??
              false);

          const linkTarget = item.getLastVisited?.() ?? item.url;

          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild tooltip={item.title} isActive={isActive}>
                <Link to={linkTarget}>
                  {item.icon}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}