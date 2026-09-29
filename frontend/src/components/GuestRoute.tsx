// components/GuestRoute.tsx
import { Navigate, Outlet } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useAuth";
import { getStoredToken } from "@/services/api";

export default function GuestRoute() {
  const hasToken = !!getStoredToken();
  const { data: user, isLoading } = useCurrentUser();

  if (!hasToken) return <Outlet />;   // guest, show the form instantly
  if (isLoading) return null;         // or a spinner, while /me is checked
  if (user) return <Navigate to="/dashboard" replace />;

  return <Outlet />;                  // token was invalid
}