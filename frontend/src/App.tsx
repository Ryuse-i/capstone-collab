import "./App.css";
import { Routes, Route, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import PrivateRoute from "@/components/PrivateRoute";
import { StudentRoutes } from "@/routes/StudentRoutes";
import { InstructorRoutes } from "@/routes/InstructorRoutes";
import { AdminRoutes } from "@/routes/AdminRoutes";

import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import NotFoundPage from "@/pages/NotFoundPage";
import LandingPage from "./pages/LandingPage";

export default function App() {
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
      <Route path="/" element={<LandingPage />} />

      <Route element={<PrivateRoute />}>
        {StudentRoutes}
        {InstructorRoutes}
        {AdminRoutes}
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
