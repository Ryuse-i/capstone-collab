import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  loginUser,
  logoutUser,
  registerUser,
  getCurrentUser,
  getMyProfile,
  updateCurrentUser,
  getStoredToken,
  storeToken,
  clearToken,
  type RegisterCredentials,
  type UpdateUserPayload,
} from "@/services/api";

// ─── Login ────────────────────────────────────────────────────────────────────

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      loginUser(email, password),
    onSuccess: (data) => {
      storeToken(data.access_token);
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    },
  });
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logoutUser,
    onSettled: () => {
      clearToken();
      queryClient.clear();
    },
  });
}

// ─── Register ─────────────────────────────────────────────────────────────────

export function useRegister() {
  return useMutation({
    mutationFn: (credentials: RegisterCredentials) => registerUser(credentials),
  });
}

// ─── Current user ─────────────────────────────────────────────────────────────

export function useCurrentUser() {
  return useQuery({
    queryKey: ["currentUser"],
    queryFn: getCurrentUser,
    enabled: !!getStoredToken(),
    retry: false,
    staleTime: 1000 * 60 * 5,
  });
}

// ─── My profile (custom route) ────────────────────────────────────────────────

export function useMyProfile() {
  return useQuery({
    queryKey: ["myProfile"],
    queryFn: getMyProfile,
    enabled: !!localStorage.getItem("access_token"),
    retry: false,
    staleTime: 1000 * 60 * 5,
  });
}

// ─── Update current user ──────────────────────────────────────────────────────

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateUserPayload) => updateCurrentUser(payload),
    onSuccess: (updatedUser) => {
      // Update cache directly — no need for a refetch
      queryClient.setQueryData(["currentUser"], updatedUser);
      queryClient.setQueryData(["myProfile"], updatedUser);
    },
  });
}
