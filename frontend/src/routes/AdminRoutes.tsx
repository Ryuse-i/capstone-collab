import { Route } from "react-router-dom";
import RoleRoute from "@/components/RoleRoute";
import { ROLES } from "@/constants/roles";

import Overview from "@/pages/admin/Overview";
import User from "@/pages/admin/User";

export const AdminRoutes = (
  <Route element={<RoleRoute role={ROLES.ADMIN} />}>
    <Route path="/dashboard" element={<Overview />} />
    <Route path="/users" element={<User />} />
  </Route>
);
