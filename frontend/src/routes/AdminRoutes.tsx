import { Route } from "react-router-dom";
import RoleRoute from "@/components/RoleRoute";
import { ROLES } from "@/constants/roles";

import Dashboard from "@/pages/admin/Dashboard";
import Settings from "@/pages/shared/Settings";

export const AdminRoutes = (
  <Route element={<RoleRoute role={ROLES.ADMIN} />}>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/settings" element={<Settings />} />
  </Route>
);
