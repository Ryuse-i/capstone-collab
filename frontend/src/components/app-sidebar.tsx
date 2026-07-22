"use client";

import { NavSecondary } from "@/components/nav-secondary";
import * as React from "react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import psuLogo from "@/assets/psu-logo.jpg";
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
} from "lucide-react";

// This is sample data.
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: <LayoutGridIcon />,
      isActive: true,
    },
    {
      title: "Project Task",
      url: "/project-task",
      icon: <FileText />,
    },
    {
      title: "My Task",
      url: "/my-task",
      icon: <FileText />,
    },
    {
      title: "Workload",
      url: "/Workload",
      icon: <MessageCircleMore />,
    },
    {
      title: "Team",
      url: "/Team",
      icon: <Users />,
    },
    {
      title: "Chat",
      url: "/chat",
      icon: <MessageCircleMore />,
    },
    {
      title: "Capstone Search",
      url: "/capstone-search",
      icon: <BookOpenIcon />,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/settings",
      icon: <Settings />,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
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
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
