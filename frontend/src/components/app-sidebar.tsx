"use client";

import { NavSecondary } from "@/components/nav-secondary";
import * as React from "react";

import { Skeleton } from "./ui/skeleton";
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
  SidebarGroup,
  SidebarHeader,
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
  UserRoundCog,
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

const studentNoProjectNavMain = [...commonNavMain, capstoneSearchNavItem];

// Full nav for a student who has joined/created a project
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

const adminNavMain = [
  {
    title: "Overview",
    url: "/dashboard",
    icon: <LayoutGridIcon />,
  },
  {
    title: "User management",
    url: "/admin/users",
    icon: <UserRoundCog />,
  },
];

// Static class names so Tailwind can generate them
// (dynamic w-${n} gets purged)
const skeletonRowWidths = ["w-20", "w-16", "w-24", "w-20", "w-24"];

function AppSidebarSkeleton() {
  return (
    <>
      <SidebarContent className="relative isolate">
        {/* Mirrors NavMain: SidebarGroup > SidebarMenu > item */}
        <SidebarGroup>
          <SidebarMenu>
            {skeletonRowWidths.map((width, index) => (
              <SidebarMenuItem key={index}>
                <div className="flex h-8 items-center gap-2 rounded-md px-2">
                  <Skeleton className="size-4 shrink-0 rounded-md" />

                  <Skeleton
                    className={`h-4 ${width} group-data-[collapsible=icon]:hidden`}
                  />
                </div>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {/* Mirrors NavSecondary (Settings), pinned to the bottom */}
        <SidebarGroup className="mt-auto">
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex h-8 items-center gap-2 rounded-md px-2">
                <Skeleton className="size-4 shrink-0 rounded-md" />

                <Skeleton className="h-4 w-16 group-data-[collapsible=icon]:hidden" />
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      {/* Mirrors NavUser */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex h-12 items-center gap-2 rounded-md p-2 group-data-[collapsible=icon]:p-0">
              <Skeleton className="size-8 shrink-0 rounded-lg" />

              <div className="grid flex-1 gap-1.5 group-data-[collapsible=icon]:hidden">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>

              <Skeleton className="ml-auto size-4 rounded-md group-data-[collapsible=icon]:hidden" />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: user } = useCurrentUser();

  const { data: currentProject, isLoading: isProjectLoading } =
    useGetCurrentProject(user?.id ?? "");

  const { data: member, isLoading: isMemberLoading } = useGetCurrentMember(
    user?.id ?? "",
  );

  const { data: projects } = useGetInstructorProjects(user?.id ?? "");

  // Check if sidebar data is loaded
  const sidebarDataLoaded = !isProjectLoading && !isMemberLoading && !!user;

  const role = user?.role?.toLowerCase();

  // TRUE only when the student has joined or created a project
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

  // Normalize the member's project role for comparison
  const memberRole = member?.project_role?.toLocaleLowerCase();

  const isLeaderOrAbove =
    memberRole === "leader" ||
    memberRole === "advisor" ||
    memberRole === "instructor" ||
    memberRole === "admin";

  let navMain;

  if (role === ROLES.STUDENT) {
    /*
     * STUDENT NAVIGATION
     *
     * No project:
     *   Dashboard
     *   Capstone Search
     *
     * With project + regular member:
     *   Dashboard
     *   My Task
     *   Chat
     *   Resources
     *   Capstone Search
     *
     * With project + leader:
     *   Dashboard
     *   Project Task
     *   My Task
     *   Workload
     *   Team
     *   Chat
     *   Resources
     *   Capstone Search
     */

    if (!shouldShowProjectNav) {
      // IMPORTANT:
      // Resources is NOT included here.
      navMain = studentNoProjectNavMain;
    } else if (isMemberLoading) {
      // Avoid a flash of the wrong navigation while
      // member role is still loading.
      navMain = studentMemberNavMain;
    } else {
      navMain = isLeaderOrAbove ? studentLeaderNavMain : studentMemberNavMain;
    }
  } else if (role === ROLES.ADMIN) {
    navMain = adminNavMain;
  } else if (role === ROLES.INSTRUCTOR || role === ROLES.ADVISOR) {
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
                    className="size-8 rounded-full object-cover"
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

      {!sidebarDataLoaded ? (
        <AppSidebarSkeleton />
      ) : (
        <>
          <SidebarContent>
            <NavMain items={navMain} />

            {(role === ROLES.INSTRUCTOR || role === ROLES.ADVISOR) && (
              <div className="group-data-[collapsible=icon]:hidden">
                <NavShortcut items={navShortcuts} />
              </div>
            )}

            <NavSecondary items={data.navSecondary} className="mt-auto" />
          </SidebarContent>

          <SidebarFooter>
            <NavUser user={sidebarUser} />
          </SidebarFooter>
        </>
      )}
    </Sidebar>
  );
}
