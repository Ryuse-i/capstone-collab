import { Route } from "react-router-dom";
import RoleRoute from "@/components/RoleRoute";
import { ROLES } from "@/constants/roles";

import Dashboard from "@/pages/student/Dashboard";
import Task from "@/pages/student/Task";
import Workload from "@/pages/student/Workload";
import Team from "@/pages/student/Team";
import CapstoneSearch from "@/pages/student/CapstoneSearch";
import Settings from "@/pages/shared/Settings";

export const StudentRoutes = (
  <Route element={<RoleRoute role={ROLES.STUDENT} />}>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/task" element={<Task/>} />
    <Route path="/workload" element={<Workload/>} />
    <Route path="/team" element={<Team/>} />
    <Route path="/settings" element={<Settings/>} />
    <Route path="/capstone-search" element={<CapstoneSearch/>} />
  </Route>
);
