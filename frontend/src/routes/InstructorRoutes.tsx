// src/routes/instructorRoutes.tsx
import { Route } from "react-router-dom";
import RoleRoute from "@/components/RoleRoute";
import { ROLES } from "@/constants/roles";

import Settings from "@/pages/shared/Settings";
import ProjectList from "@/pages/instructor/ProjectList";
import ProjectView from "@/pages/instructor/ProjectView";

export const InstructorRoutes = (
  <Route element={<RoleRoute role={[ROLES.INSTRUCTOR, ROLES.ADVISOR]} />}>
    <Route path="/settings" element={<Settings />} />
    <Route path="/project-list" element={<ProjectList />} />
    <Route path="/view-project/:id" element={<ProjectView />} />
  </Route>
);
