import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { ChevronsUpDownIcon, LogOutIcon, Sparkles } from "lucide-react";
import { useState } from "react";
import { useLogout } from "@/hooks/useAuth";
import { useGetProjectMemberByUserId } from "@/hooks/useProjectMember";
import { useOnboardingTour } from "@/hooks/useOnboardingTour";
import { GuidesDialog } from "@/components/user/GuidesDialog";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ROLES } from "@/constants/roles";
import type { OnboardingTourId } from "@/lib/onboarding";

function getInitials(name: string, email?: string) {
  const trimmedName = name?.trim();

  if (trimmedName) {
    const parts = trimmedName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }

    return trimmedName.slice(0, 2).toUpperCase();
  }

  if (email) {
    return email.slice(0, 2).toUpperCase();
  }

  return "U";
}

export function NavUser({
  user,
}: {
  user: {
    id?: string;
    role?: string;
    name: string;
    email: string;
    avatar: string;
  };
}) {
  const { isMobile } = useSidebar();
  const { mutate: logout, isPending } = useLogout();
  const role = user.role?.toLowerCase();
  const isStudent = role === ROLES.STUDENT;
  const isInstructor = role === ROLES.INSTRUCTOR;
  const membershipQuery = useGetProjectMemberByUserId(
    isStudent ? (user.id ?? "") : "",
  );
  const { requestTour } = useOnboardingTour();
  const location = useLocation();
  const navigate = useNavigate();
  const [guidesOpen, setGuidesOpen] = useState(false);
  const initials = getInitials(user.name, user.email);

  async function replayOnboardingGuide() {
    if (!user.id) return;

    let tourId: OnboardingTourId;
    if (isInstructor) {
      tourId = "instructor";
    } else {
      const result = await membershipQuery.refetch();
      if (result.isError) {
        toast.error("Couldn't load your project role. Please try again.");
        return;
      }
      const membership = result.data;
      tourId = !membership
        ? "student-no-project"
        : membership.project_role === "leader"
          ? "student-leader"
          : "student-member";
    }

    requestTour(user.id, tourId);
    if (location.pathname !== "/dashboard") {
      navigate("/dashboard");
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-full">
                <AvatarImage src={user.avatar || undefined} alt={user.name} />
                <AvatarFallback className="rounded-full font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDownIcon className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-full bg-primary">
                  <AvatarImage src={user.avatar || undefined} alt={user.name} />
                  <AvatarFallback className="rounded-full font-bold dark:bg-gray-800 ring-1 dark:ring-gray-600">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate text-foreground font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {(isStudent || isInstructor) && (
              <>
                <DropdownMenuItem
                  onSelect={() => setGuidesOpen(true)}
                  className="cursor-pointer"
                >
                  <Sparkles />
                  Guides &amp; tutorials
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem
              onClick={() => logout()}
              className="cursor-pointer"
              disabled={isPending}
            >
              <LogOutIcon />
              {isPending ? "Logging out..." : "Logout"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
      <GuidesDialog
        open={guidesOpen}
        onOpenChange={setGuidesOpen}
        onReplayOnboarding={() => void replayOnboardingGuide()}
      />
    </SidebarMenu>
  );
}
