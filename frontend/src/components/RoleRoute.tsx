import { Navigate, Outlet } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useAuth";
import type { Role } from "@/constants/roles";
import { Loader2 } from "lucide-react";

interface RoleRouteProps {
  role: Role | Role[];
}

export default function RoleRoute({ role }: RoleRouteProps) {
  const { data: user, isLoading, isError } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (isError || !user?.role) return <Navigate to="/login" replace />;

  const allowedRoles = Array.isArray(role) ? role : [role];
  if (!allowedRoles.includes(user.role as Role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
