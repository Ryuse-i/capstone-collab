import { Route } from "react-router-dom";
import RoleRoute from "@/components/RoleRoute";
import { ROLES } from "@/constants/roles";

import Dashboard from "@/pages/advisor/Dashboard";

export const AdvisorRoutes = (
  <Route element={<RoleRoute role={[ROLES.ADVISOR]} />}>
    <Route path="/dashboard" element={<Dashboard />} />
  </Route>
);
