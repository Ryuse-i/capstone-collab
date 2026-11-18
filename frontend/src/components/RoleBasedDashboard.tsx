import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useCurrentUser } from "@/hooks/useAuth";
import { useGetProjectMemberByUserId } from "@/hooks/useProjectMember";
import { ROLES } from "@/constants/roles";
import type { UserRole } from "@/services/api";
import { Button } from "@/components/ui/button";

import StudentDashboard from "@/pages/student/Dashboard";
import MemberDashboard from "@/pages/student/MemberDashboard";
import InstructorDashboard from "@/pages/instructor/Dashboard";
import AdminDashboard from "@/pages/admin/Overview";

export default function RoleBasedDashboard() {
  const { data: user, isLoading, isError } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (isError || !user?.role) return <Navigate to="/login" replace />;

  switch (user.role as UserRole) {
    case ROLES.ADMIN as UserRole:
      return <AdminDashboard />;
    case ROLES.INSTRUCTOR as UserRole:
      return <InstructorDashboard />;
    case ROLES.STUDENT as UserRole: {
      // A student who is a project leader sees the project-health dashboard;
      // a normal project member sees the personal member dashboard.
      return <StudentRoleRouter userId={user.id} />;
    }
    default:
      return <StudentDashboard />;
  }
}

function StudentRoleRouter({ userId }: { userId: string }) {
  const {
    data: membership,
    isPending,
    isFetching,
    isError,
    refetch,
  } = useGetProjectMemberByUserId(userId);

  if (isPending || isFetching) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div
        className="flex h-screen flex-col items-center justify-center gap-3 p-6 text-center"
        role="alert"
      >
        <p className="text-foreground">
          We couldn't load your project membership.
        </p>
        <Button onClick={() => void refetch()}>Try again</Button>
      </div>
    );
  }

  if (!membership || membership.project_role === "leader") {
    return <StudentDashboard />;
  }

  return <MemberDashboard />;
}
