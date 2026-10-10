export type AdminUserRole = "student" | "instructor" | "admin";

export interface AdminUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: AdminUserRole;
  is_active: boolean;
  is_superuser: boolean;
  is_verified: boolean;
  must_change_password: boolean;
  deleted_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface AdminUserListResponse {
  items: AdminUser[];
  total: number;
  page: number;
  page_size: number;
}

export interface AdminUserFilters {
  search?: string;
  role?: AdminUserRole;
  is_active?: boolean;
  page: number;
  page_size: number;
}

export interface CreateAdminUserPayload{
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  role: AdminUserRole;
  is_active: boolean;
  must_change_password: true;
}

export interface UpdateAdminUserPayload {
  first_name?: string;
  last_name?: string;
  role?: AdminUserRole;
  is_active?: boolean;
  must_change_password?: boolean;
}