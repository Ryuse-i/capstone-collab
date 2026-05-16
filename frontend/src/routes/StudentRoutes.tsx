import { Route } from "react-router-dom";
import RoleRoute from "@/components/RoleRoute";
import { ROLES } from "@/constants/roles";

import Dashboard from "@/pages/student/Dashboard";
import Task from "@/pages/Task";
import Workload from "@/pages/Workload";
import Team from "@/pages/Team";
import CapstoneSearch from "@/pages/CapstoneSearch";
import Settings from "@/pages/Settings";

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
