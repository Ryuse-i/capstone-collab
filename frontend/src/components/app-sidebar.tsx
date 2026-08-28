"use client";

import { NavSecondary } from "@/components/nav-secondary";
import * as React from "react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import psuLogo from "@/assets/psu-logo.jpg";
import { ROLES } from "@/constants/roles";
import { useCurrentUser } from "@/hooks/useAuth";
import { useGetCurrentProject } from "@/hooks/useProject";
import { useGetCurrentMember } from "@/hooks/useProjectMember";
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

const projectTaskNavItem = {
  title: "Project Task",
  url: "/project-task",
  icon: <FileText />,
};

const myTaskNavItem = {
  title: "My Task",
  url: "/mytask",
  icon: <ClipboardCheck />,
};

const workloadNavItem = {
  title: "Workload",
  url: "/workload",
  icon: <LucideLayers />,
};

const teamNavItem = {
  title: "Team",
  url: "/team",
  icon: <Users />,
};

const chatNavItem = {
  title: "Chat",
  url: "/chat",
  icon: <MessageCircleMore />,
};

// Full nav for a student who is the project leader
const studentLeaderNavMain = [
  ...commonNavMain,
  projectTaskNavItem,
  myTaskNavItem,
  workloadNavItem,
  teamNavItem,
  chatNavItem,
  capstoneSearchNavItem,
];

// Reduced nav for a student who is just a project member
const studentMemberNavMain = [
  ...commonNavMain,
  myTaskNavItem,
  chatNavItem,
  capstoneSearchNavItem,
];

const studentNoProjectNavMain = [...commonNavMain, capstoneSearchNavItem];

const instructorNavMain = [
  ...commonNavMain,
  {
    title: "Projects",
    url: "/project-list",
    icon: <FileText />,
  },
  capstoneSearchNavItem,
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: user } = useCurrentUser();
  const { data: currentProject, isLoading: isProjectLoading } =
    useGetCurrentProject(user?.id ?? "");
  const { data: member, isLoading: isMemberLoading } = useGetCurrentMember(
    user?.id ?? "",
  );
  const role = user?.role?.toLowerCase();
  const hasProject = Boolean(currentProject);
  const shouldShowProjectNav = !isProjectLoading && hasProject;

  // normalize the member's project role for comparison

  const memberRole = member?.project_role.toLocaleLowerCase();
  console.log(role, memberRole);

  const isLeaderOrAbove =
    memberRole === "leader" ||
    memberRole === "advisor" ||
    memberRole === "instructor" ||
    memberRole === "admin";

  let navMain;
  if (role === ROLES.STUDENT) {
    if (!shouldShowProjectNav) {
      navMain = studentNoProjectNavMain;
    } else if (isMemberLoading) {
      // avoid a flash of the wrong nav while member role is still loading
      navMain = studentMemberNavMain;
    } else {
      navMain = isLeaderOrAbove ? studentLeaderNavMain : studentMemberNavMain;
    }
  } else if (
    role === ROLES.ADMIN ||
    role === ROLES.INSTRUCTOR ||
    role === ROLES.ADVISOR
  ) {
    navMain = instructorNavMain;
  } else {
    navMain = commonNavMain;
  }

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
            <SidebarMenuButton asChild className="...">
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
