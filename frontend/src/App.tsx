import "./App.css";
import { Routes, Route, useNavigate } from "react-router-dom";
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
import LoginPage from "@/pages/AuthPage";
import NotFoundPage from "@/pages/NotFoundPage";
import UnauthorizedPage from "@/pages/UnauthorizedPage";
import LandingPage from "./pages/LandingPage";
import Settings from "@/pages/shared/Settings";
import Chat from "./pages/shared/Chat";
import CapstoneSearch from "./pages/shared/CapstoneSearch";
import CapstoneView from "./pages/shared/CapstoneView";

export default function App() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const handler = () => {
      queryClient.clear();
      navigate("/login");
    };
    window.addEventListener("auth:expired", handler);
    return () => window.removeEventListener("auth:expired", handler);
  }, [navigate, queryClient]);

  return (
    <Routes>
      <Route element={<GuestRoute/>}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<LoginPage />} />
      </Route>
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/" element={<LandingPage />} />

      <Route element={<PrivateRoute />}>
        <Route path="/dashboard" element={<RoleBasedDashboard />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/capstone-search" element={<CapstoneSearch />} />
        <Route path="/capstone-view/:id" element={<CapstoneView/>} />
        <Route element={<RoleRoute role={[ROLES.INSTRUCTOR, ROLES.STUDENT]} />}>
          <Route path="/chat" element={<Chat />} />
        </Route>
        {StudentRoutes}
        {InstructorRoutes}
        {AdminRoutes}
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
