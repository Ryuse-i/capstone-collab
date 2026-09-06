import { Navigate, Outlet } from "react-router-dom";
import { getStoredToken } from "@/services/api";
import { Spinner } from "./ui/spinner";
import { useCurrentUser } from "@/hooks/useAuth";

export default function PrivateRoute() {
  const token = getStoredToken();
  const { isLoading, isError, isSuccess } = useCurrentUser();

  // No token at all → redirect immediately
  if (!token) return <Navigate to="/login" replace />;

  // Token exists but we're verifying it with the server
  if (isLoading)
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner />
      </div>
    );
  // Token is invalid/expired → redirect
  if (isError) return <Navigate to="/login" replace />;

  if (!isSuccess)
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner />
      </div>
    );

  // All good → render the protected page
  return <Outlet />;
}
