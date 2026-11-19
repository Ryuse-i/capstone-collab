// components/GuestRoute.tsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useAuth";
import { getStoredToken } from "@/services/api";
import { getPostAuthPath } from "@/lib/authRedirect";
import psuLogo from "@/assets/psu-logo.jpg";
import { Spinner } from "@/components/ui/spinner";

export default function GuestRoute() {
  const location = useLocation();
  const hasToken = !!getStoredToken();
  const { data: user, isFetching } = useCurrentUser();

  if (!hasToken) return <Outlet />;   // guest, show the form instantly
  if (isFetching)
    return (
      <main
        className="flex min-h-svh items-center justify-center bg-background px-6"
        aria-busy="true"
      >
        <div className="flex w-full max-w-sm flex-col items-center text-center">
          <img
            src={psuLogo}
            alt="PSU Lubao Campus"
            className="mb-5 size-16 rounded-full object-cover ring-4 ring-primary/10"
          />
          <Spinner className="mb-4 size-6 text-primary" />
          <p className="font-medium text-foreground">Checking your session</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Please wait while we securely verify your account.
          </p>
        </div>
      </main>
    );
  if (user) {
    return <Navigate to={getPostAuthPath(location.search)} replace />;
  }

  return <Outlet />;                  // token was invalid
}