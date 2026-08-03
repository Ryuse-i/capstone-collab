import { Route } from "react-router-dom";
import RoleRoute from "@/components/RoleRoute";
import { ROLES } from "@/constants/roles";

import ProjectTask from "@/pages/student/ProjectTask"
import Workload from "@/pages/student/Workload";
import Team from "@/pages/student/Team";
import CapstoneSearch from "@/pages/student/CapstoneSearch";
import Chat from "@/pages/student/Chat";
import MyTask from "@/pages/student/MyTask";

export const StudentRoutes = (
  <Route element={<RoleRoute role={ROLES.STUDENT} />}>
    <Route path="/project-task" element={<ProjectTask />} />
    <Route path="/mytask" element={<MyTask />} />
    <Route path="/workload" element={<Workload />} />
    <Route path="/team" element={<Team />} />
    <Route path="/capstone-search" element={<CapstoneSearch />} />
    <Route path="/chat" element={<Chat />} />
  </Route>
);
