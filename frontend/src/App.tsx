import "./App.css";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import PrivateRoute from "@/components/PrivateRoute";
import RoleBasedDashboard from "@/components/RoleBasedDashboard";
import RoleRoute from "./components/RoleRoute";
import { StudentRoutes } from "@/routes/StudentRoutes";
import { InstructorRoutes } from "@/routes/InstructorRoutes";
import GuestRoute from "./components/GuestRoute";
import { AdminRoutes } from "@/routes/AdminRoutes";
import { ROLES } from "./constants/roles";
import { useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import LoginPage from "@/pages/AuthPage";
import NotFoundPage from "@/pages/NotFoundPage";
import UnauthorizedPage from "@/pages/UnauthorizedPage";
import LandingPage from "./pages/LandingPage";
import Settings from "@/pages/shared/Settings";
import Chat from "./pages/shared/Chat";
import CapstoneRepository from "./pages/shared/CapstoneRepository";
import CapstoneView from "./pages/shared/CapstoneView";
import InvitePage from "./pages/InvitePage";
import { OnboardingTourProvider } from "@/components/onboarding/OnboardingTourProvider";

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => {
    const handler = () => {
      queryClient.clear();
      const loginPath = location.pathname.startsWith("/invite/")
        ? `/login?next=${encodeURIComponent(
            `${location.pathname}${location.search}`,
          )}`
        : "/login";
      navigate(loginPath);
    };
    window.addEventListener("auth:expired", handler);
    return () => window.removeEventListener("auth:expired", handler);
  }, [location.pathname, location.search, navigate, queryClient]);

  return (
    <OnboardingTourProvider>
      <Routes>
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<LoginPage />} />
        </Route>
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/" element={<LandingPage />} />

        <Route element={<PrivateRoute />}>
          <Route path="/dashboard" element={<RoleBasedDashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/capstone-repository" element={<CapstoneRepository />} />
          <Route path="/capstone-view/:id" element={<CapstoneView />} />
          <Route path="/invite/:token" element={<InvitePage/>} />
          <Route
            element={<RoleRoute role={[ROLES.INSTRUCTOR, ROLES.STUDENT]} />}
          >
            <Route path="/chat" element={<Chat />} />
          </Route>
          {StudentRoutes}
          {InstructorRoutes}
          {AdminRoutes}
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      {/* Single app-wide toaster: covers login/signup and the dashboard */}
      <Toaster position="top-right" />
    </OnboardingTourProvider>
  );
}