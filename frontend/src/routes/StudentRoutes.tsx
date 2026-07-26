import { Route } from "react-router-dom";
import RoleRoute from "@/components/RoleRoute";
import { ROLES } from "@/constants/roles";

import Workload from "@/pages/student/Workload";
import Team from "@/pages/student/Team";
import CapstoneSearch from "@/pages/student/CapstoneSearch";
import Settings from "@/pages/shared/Settings";
import Chat from "@/pages/student/Chat";
import MyTask from "@/pages/student/MyTask";

export const StudentRoutes = (
  <Route element={<RoleRoute role={ROLES.STUDENT} />}>
    <Route path="/task" element={<MyTask />} />
    <Route path="/workload" element={<Workload />} />
    <Route path="/team" element={<Team />} />
    <Route path="/settings" element={<Settings />} />
    <Route path="/capstone-search" element={<CapstoneSearch />} />
    <Route path="/capstone-search" element={<Chat />} />
  </Route>
);
