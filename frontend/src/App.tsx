import "./App.css";
import { Routes, Route, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import PrivateRoute from "@/components/PrivateRoute";
import RoleBasedDashboard from "@/components/RoleBasedDashboard";
import { StudentRoutes } from "@/routes/StudentRoutes";
import { InstructorRoutes } from "@/routes/InstructorRoutes";
import { AdminRoutes } from "@/routes/AdminRoutes";
import { useQueryClient } from "@tanstack/react-query";

import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import NotFoundPage from "@/pages/NotFoundPage";
import UnauthorizedPage from "@/pages/UnauthorizedPage";
import LandingPage from "./pages/LandingPage";
import Settings from "@/pages/shared/Settings";

export default function App() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const handler = () => {
      queryClient.clear()
      navigate("/login");
    };
    window.addEventListener("auth:expired", handler);
    return () => window.removeEventListener("auth:expired", handler);
  }, [navigate, queryClient]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/" element={<LandingPage />} />

      <Route element={<PrivateRoute />}>
        <Route path="/dashboard" element={<RoleBasedDashboard />} />
        <Route path="/settings" element={<Settings />} />
        {StudentRoutes}
        {InstructorRoutes}
        {AdminRoutes}
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
