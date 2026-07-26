// src/routes/instructorRoutes.tsx
import { Route } from "react-router-dom";
import RoleRoute from "@/components/RoleRoute";
import { ROLES } from "@/constants/roles";

import Settings from "@/pages/shared/Settings";

export const InstructorRoutes = (
  <Route element={<RoleRoute role={[ROLES.INSTRUCTOR, ROLES.ADVISOR]} />}>
    <Route path="/settings" element={<Settings />} />
  </Route>
);
