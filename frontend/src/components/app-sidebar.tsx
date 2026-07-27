"use client";

import { NavSecondary } from "@/components/nav-secondary";
import * as React from "react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import psuLogo from "@/assets/psu-logo.jpg";
import { ROLES } from "@/constants/roles";
import { useCurrentUser } from "@/hooks/useAuth";
import { useGetCurrentProject } from "@/hooks/useProject";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarMenuButton,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  FileText,
  BookOpenIcon,
  LayoutGridIcon,
  Settings,
  MessageCircleMore,
  Users,
  ClipboardCheck,
  LucideLayers,
} from "lucide-react";

const data = {
  navSecondary: [
    {
      title: "Settings",
      url: "/settings",
      icon: <Settings />,
    },
  ],
};

const commonNavMain = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: <LayoutGridIcon />,
    isActive: true,
  },
];

const capstoneSearchNavItem = {
  title: "Capstone Search",
  url: "/capstone-search",
  icon: <BookOpenIcon />,
};

const studentNavMain = [
  ...commonNavMain,
  
  {
    title: "Project Task",
    url: "/project-task",
    icon: <FileText />,
  },
  {
    title: "My Task",
    url: "/mytask",
    icon: <ClipboardCheck />,
  },
  {
    title: "Workload",
    url: "/workload",
    icon: <LucideLayers />,
  },
  {
    title: "Team",
    url: "/team",
    icon: <Users />,
  },
  {
    title: "Chat",
    url: "/chat",
    icon: <MessageCircleMore />,
  },
  capstoneSearchNavItem,
];

const studentNoProjectNavMain = [...commonNavMain, capstoneSearchNavItem];

const instructorNavMain = [...commonNavMain];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: user } = useCurrentUser();
  const { data: currentProject, isLoading: isProjectLoading } =
    useGetCurrentProject(user?.id ?? "");
  const role = user?.role?.toLowerCase();
  const hasProject = Boolean(currentProject);
  const shouldShowProjectNav = !isProjectLoading && hasProject;

  const navMain =
    role === ROLES.STUDENT
      ? shouldShowProjectNav
        ? studentNavMain
        : studentNoProjectNavMain
      : role === ROLES.ADMIN ||
          role === ROLES.INSTRUCTOR ||
          role === ROLES.ADVISOR
        ? instructorNavMain
        : commonNavMain;

  const sidebarUser = {
    name:
      [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
      user?.email ||
      "User",
    email: user?.email || "user@example.com",
    avatar: "/avatars/shadcn.jpg",
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="hover:bg-transparent hover:text-current active:bg-transparent group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:w-8! group-data-[collapsible=icon]:h-8! group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center"
            >
              <a
                href="/dashboard"
                className="flex items-center gap-2 overflow-hidden"
              >
                <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground">
                  <img
                    src={psuLogo}
                    alt="PSU Logo"
                    className="size-8 object-cover rounded-full"
                  />
                </div>
                <span className="font-medium truncate group-data-[collapsible=icon]:hidden">
                  PSU Collab
                </span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={sidebarUser} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
