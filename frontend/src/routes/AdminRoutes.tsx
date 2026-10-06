import { Route } from "react-router-dom";
import RoleRoute from "@/components/RoleRoute";
import { ROLES } from "@/constants/roles";

import Overview from "@/pages/admin/Overview";
import User from "@/pages/admin/User";
import CapstoneRepository from "@/pages/admin/CapstoneRepo";
import CapstoneView from "@/pages/admin/CapstoneView";

export const AdminRoutes = (
  <Route element={<RoleRoute role={ROLES.ADMIN} />}>
    <Route path="/dashboard" element={<Overview />} />
    <Route path="/admin/users" element={<User />} />
    <Route path="/admin/capstone" element={<CapstoneRepository />} />
    <Route path="/admin/capstone-view/:id" element={<CapstoneView />} />
  </Route>
);
