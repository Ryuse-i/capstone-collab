"use client";

import { NavSecondary } from "@/components/nav-secondary";
import * as React from "react";

import { NavMain } from "@/components/nav-main";
import { NavMain as NavShortcut } from "@/components/nav-shortcut";
import { NavUser } from "@/components/nav-user";
import psuLogo from "@/assets/psu-logo.jpg";
import { ROLES } from "@/constants/roles";
import { useCurrentUser } from "@/hooks/useAuth";
import { useGetCurrentMember } from "@/hooks/useProjectMember";
import {
  useGetCurrentProject,
  useGetInstructorProjects,
} from "@/hooks/useProject";
import { getLastVisitedCapstone } from "@/lib/lastVisitedCapstone";
import { getLastVisitedProjects } from "@/lib/lastVisitedProjects";
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
  FolderKanban,
  FolderOpen,
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
  // CapstoneView (/capstone-view/:id) has no sidebar entry of its own —
  // it's only reachable by clicking into a result from Capstone Search —
  // so treat it as part of the same section for active-state highlighting.
  matchPrefixes: ["/capstone-view"],
  // Clicking this item returns to whichever capstone-search/capstone-view
  // path the user last visited, instead of always resetting to the list.
  getLastVisited: getLastVisitedCapstone,
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

const resourcesNavItem = {
  title: "Resources",
  url: "/resources",
  icon: <FolderOpen />,
};

const studentNoProjectNavMain = [
  ...commonNavMain,
  resourcesNavItem,
  capstoneSearchNavItem,
];

// Full nav for a student who is the project leader
const studentLeaderNavMain = [
  ...commonNavMain,
  projectTaskNavItem,
  myTaskNavItem,
  workloadNavItem,
  teamNavItem,
  chatNavItem,
  resourcesNavItem,
  capstoneSearchNavItem,
];

// Reduced nav for a student who is just a project member
const studentMemberNavMain = [
  ...commonNavMain,
  myTaskNavItem,
  chatNavItem,
  resourcesNavItem,
  capstoneSearchNavItem,
];

const instructorNavMain = [
  ...commonNavMain,
  {
    title: "Projects",
    url: "/project-list",
    icon: <FileText />,
    // ProjectView (/view-project/:id) has no sidebar entry of its own —
    // it's only reachable by clicking "View" from the Projects list —
    // so treat it as part of the same section for active-state highlighting.
    matchPrefixes: ["/view-project"],
    // Clicking this item returns to whichever project-list/view-project
    // path the user last visited, instead of always resetting to the list.
    getLastVisited: getLastVisitedProjects,
  },
  chatNavItem,
  capstoneSearchNavItem,
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: user } = useCurrentUser();
  const { data: currentProject, isLoading: isProjectLoading } =
    useGetCurrentProject(user?.id ?? "");
  const { data: member, isLoading: isMemberLoading } = useGetCurrentMember(
    user?.id ?? "",
  );
  const { data: projects } = useGetInstructorProjects(user?.id ?? "");
  const role = user?.role?.toLowerCase();
  const hasProject = Boolean(currentProject);
  const shouldShowProjectNav = !isProjectLoading && hasProject;
  const recentProjects =
    projects
      ?.filter(
        (project) =>
          project.instructor === user?.id || project.advisor === user?.id,
      )
      .filter((project, index, allProjects) =>
        project.id
          ? allProjects.findIndex((item) => item.id === project.id) === index
          : true,
      )
      .filter((project) => project.id)
      .map((project) => ({
        title: project.name,
        url: `/view-project/${project.id}`,
      })) ?? [];

  const navShortcuts = [
    {
      title: "Projects",
      url: "/project-list",
      icon: FolderKanban,
      isActive: true,
      items: recentProjects,
    },
  ];

  // normalize the member's project role for comparison

  const memberRole = member?.project_role.toLocaleLowerCase();

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
            <SidebarMenuButton
              asChild
              tooltip="PSU Collab"
              className="group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0"
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
                <span className="truncate font-medium group-data-[collapsible=icon]:hidden">
                  PSU Collab
                </span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={navMain} />
        {(role === ROLES.INSTRUCTOR || role === ROLES.ADVISOR) && (
          <NavShortcut items={navShortcuts} />
        )}
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={sidebarUser} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
