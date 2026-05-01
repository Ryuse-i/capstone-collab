import "./App.css";
import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import SignupPage from "./pages/SignupPage";
import PrivateRoute from "./components/PrivateRoute";
import NotFoundPage from "./pages/NotFoundPage";

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Protected routes */}
      <Route element={<PrivateRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        {/* Goto notfound when no page or route*/}
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Goto login when not authenticated*/}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
