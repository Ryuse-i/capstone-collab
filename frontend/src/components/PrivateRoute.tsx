import { Navigate, Outlet } from "react-router-dom";
import { getStoredToken } from "@/services/api";
import { useCurrentUser } from "@/hooks/useAuth";
import { Spinner } from "./ui/spinner";

export default function PrivateRoute() {
  const token = getStoredToken();
  const { isLoading, isError, isSuccess } = useCurrentUser();

  // No token at all → redirect immediately
  if (!token) return <Navigate to="/login" replace />;

  // Token exists but we're verifying it with the server
  if (isLoading) return <Spinner />;
  // Token is invalid/expired → redirect
  if (isError) return <Navigate to="/login" replace />;

  if (!isSuccess) return <Spinner />;

  // All good → render the protected page
  return <Outlet />;
}
