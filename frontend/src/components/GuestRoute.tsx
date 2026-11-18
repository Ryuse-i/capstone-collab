// components/GuestRoute.tsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useAuth";
import { getStoredToken } from "@/services/api";
import { getPostAuthPath } from "@/lib/authRedirect";

export default function GuestRoute() {
  const location = useLocation();
  const hasToken = !!getStoredToken();
  const { data: user, isLoading } = useCurrentUser();

  if (!hasToken) return <Outlet />;   // guest, show the form instantly
  if (isLoading) return null;         // or a spinner, while /me is checked
  if (user) {
    return <Navigate to={getPostAuthPath(location.search)} replace />;
  }

  return <Outlet />;                  // token was invalid
}