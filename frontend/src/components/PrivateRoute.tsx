import { Navigate, Outlet } from "react-router-dom";
import { getStoredToken } from "@/services/api";
import { useCurrentUser } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

export default function PrivateRoute() {
  const token = getStoredToken();
  const { isLoading, isError } = useCurrentUser();

  // No token at all → redirect immediately
  if (!token) return <Navigate to="/login" replace />;

  // Token exists but we're verifying it with the server
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  // Token is invalid/expired → redirect
  if (isError) return <Navigate to="/login" replace />;

  // All good → render the protected page
  return <Outlet />;
}
