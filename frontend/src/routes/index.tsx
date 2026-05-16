import { Routes, Route, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import PrivateRoute from "@/components/PrivateRoute";
import { StudentRoutes } from "./StudentRoutes";
import { InstructorRoutes } from "./InstructorRoutes";
import { AdminRoutes } from "./AdminRoutes";

import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import NotFoundPage from "@/pages/NotFoundPage";

export default function AppRoutes() {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = () => navigate("/login");
    window.addEventListener("auth:expired", handler);
    return () => window.removeEventListener("auth:expired", handler);
  }, [navigate]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      <Route element={<PrivateRoute />}>
        {StudentRoutes}
        {InstructorRoutes}
        {AdminRoutes}
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
