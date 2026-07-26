import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useCurrentUser } from "@/hooks/useAuth";
import { ROLES } from "@/constants/roles";
import type { UserRole } from "@/services/api";

import StudentDashboard from "@/pages/student/Dashboard";
import InstructorDashboard from "@/pages/instructor/Dashboard";
import AdminDashboard from "@/pages/admin/Dashboard";

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
    case ROLES.ADVISOR as UserRole:
      return <InstructorDashboard />;
    case ROLES.STUDENT as UserRole:
    default:
      return <StudentDashboard />;
  }
}
