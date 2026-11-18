import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getStoredToken } from "@/services/api";
import { Spinner } from "./ui/spinner";
import { useCurrentUser } from "@/hooks/useAuth";

export default function PrivateRoute() {
  const location = useLocation();
  const token = getStoredToken();
  const { isLoading, isError, isSuccess } = useCurrentUser();
  const loginPath = location.pathname.startsWith("/invite/")
    ? `/login?next=${encodeURIComponent(
        `${location.pathname}${location.search}`,
      )}`
    : "/login";

  // No token at all → redirect immediately
  if (!token) return <Navigate to={loginPath} replace />;

  // Token exists but we're verifying it with the server
  if (isLoading)
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner />
      </div>
    );
  // Token is invalid/expired → redirect
  if (isError) return <Navigate to={loginPath} replace />;

  if (!isSuccess)
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner />
      </div>
    );

  // All good → render the protected page
  return <Outlet />;
}
