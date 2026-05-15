import "./App.css";
import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import SignupPage from "./pages/SignupPage";
import NotFoundPage from "./pages/NotFoundPage";
import Task from "./pages/Task";
import Workload from "./pages/Workload";
import Team from "./pages/Team";
import CapstoneSearch from "./pages/CapstoneSearch";
import Settings from "./pages/Settings";


export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Protected routes */}
     
        <Route path="/dashboard" element={<Dashboard />} />  
        <Route path="/task" element={<Task />} />
        <Route path="/workload" element={<Workload />} />
        <Route path="/team" element={<Team />} />
        <Route path="/capstone-search" element={<CapstoneSearch />} />
        <Route path="/settings" element={<Settings />} />


        {/* Goto notfound when no page or route*/}
        <Route path="*" element={<NotFoundPage />} />
      

      {/* Goto login when not authenticated*/}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}