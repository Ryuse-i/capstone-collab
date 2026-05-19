import { Navigate, Outlet } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useAuth";
import type { Role } from "@/constants/roles";

interface RoleRouteProps {
  role: Role;
}

export default function RoleRoute({ role }: RoleRouteProps) {
  const { data: user } = useCurrentUser();

  if (user?.role !== role) return <Navigate to="/unauthorized" replace />;

  return <Outlet />;
}
