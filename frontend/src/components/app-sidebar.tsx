"use client";

import { NavSecondary } from "@/components/nav-secondary";
import * as React from "react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
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
  GalleryVerticalEndIcon,
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
      title: "Task",
      url: "/Task",
      icon: <FileText />,
    },
    {
      title: "Workload",
      url: "/Workload",
      icon: <MessageCircleMore />
    },
    {
      title: "Team",
      url: "/Team",
      icon: <Users />,
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
      icon: <Settings/>
      ,
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
              className="data-[slot=sidebar-menu-button]:p-1.5!
              hover:bg-transparent hover:text-current active:bg-transparent"
            >
              <a href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <GalleryVerticalEndIcon className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-medium">PSU Collab</span>
                </div>
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
