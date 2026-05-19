// src/routes/instructorRoutes.tsx
import { Route } from "react-router-dom";
import RoleRoute from "@/components/RoleRoute";
import { ROLES } from "@/constants/roles";

import Dashboard from "@/pages/instructor/Dashboard";
import Settings from "@/pages/shared/Settings";

export const InstructorRoutes = (
  <Route element={<RoleRoute role={ROLES.INSTRUCTOR} />}>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/settings" element={<Settings />} />
  </Route>
);
