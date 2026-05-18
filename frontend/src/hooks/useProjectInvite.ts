import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { getStoredToken } from "@/services/api"; // Reuse your existing token helper

// Matching types from your Pydantic schemas
export interface ProjectInvitationCreate {
  project_id: string;
  sender_id: string;
  email: string;
  role?: string;
}

export interface ProjectInvitationUpdate {
  email?: string | null;
  role?: string | null;
  status?: string | null; // pending, accepted, declined
}

export interface ProjectInvitationResponse {
  id: string;
  project_id: string;
  sender_id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

// Adjust the fallback URL route based on where your project_member_router is mounted
const BASE_URL =
  import.meta.env.VITE_API_URL 
    ? `${import.meta.env.VITE_API_URL}/invitations`
    : "http://127.0.0.1:8000/invitations"; 

// ─── Fetchers ────────────────────────────────────────────────────────────────

async function fetchAllInvitations(): Promise<ProjectInvitationResponse[]> {
  const res = await fetch(`${BASE_URL}/`, {
    headers: { Authorization: `Bearer ${getStoredToken()}` },
  });
  if (!res.ok) throw new Error("Failed to fetch invitations");
  return res.json();
}

async function fetchOneInvitation(invitationId: string): Promise<ProjectInvitationResponse> {
  const res = await fetch(`${BASE_URL}/${invitationId}`, {
    headers: { Authorization: `Bearer ${getStoredToken()}` },
  });
  if (!res.ok) throw new Error("Invitation not found");
  return res.json();
}

// ─── Query hooks ─────────────────────────────────────────────────────────────

export function useGetAllInvitations() {
  return useQuery<ProjectInvitationResponse[], Error>({
    queryKey: ["invitations"],
    queryFn: fetchAllInvitations,
    enabled: !!getStoredToken(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

export function useGetOneInvitation(invitationId: string) {
  return useQuery<ProjectInvitationResponse, Error>({
    queryKey: ["invitation", invitationId],
    queryFn: () => fetchOneInvitation(invitationId),
    enabled: !!invitationId && !!getStoredToken(),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
}

// ─── Mutation hooks ───────────────────────────────────────────────────────────

export function useCreateInvitation() {
  const queryClient = useQueryClient();
  return useMutation<ProjectInvitationResponse, Error, ProjectInvitationCreate>({
    mutationFn: async (data) => {
      const res = await fetch(`${BASE_URL}/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getStoredToken()}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create invitation");
      return res.json();
    },
    onSuccess: (newInvite) => {
      // Invalidate the main list view cache
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      // Invalidate specific project contexts if dashboard components listen to project scopes
      queryClient.invalidateQueries({ queryKey: ["project", newInvite.project_id] });
    },
  });
}

export function useUpdateInvitation(invitationId: string) {
  const queryClient = useQueryClient();
  return useMutation<ProjectInvitationResponse, Error, ProjectInvitationUpdate>({
    mutationFn: async (data) => {
      const res = await fetch(`${BASE_URL}/${invitationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getStoredToken()}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update invitation");
      return res.json();
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["invitation", invitationId], updated);
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
    },
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();
  return useMutation<ProjectInvitationResponse, Error, string>({
    mutationFn: async (invitationId) => {
      const res = await fetch(`${BASE_URL}/${invitationId}/accept`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getStoredToken()}` },
      });
      if (!res.ok) throw new Error("Failed to accept invitation");
      return res.json();
    },
    onSuccess: (updatedInvitation) => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      queryClient.invalidateQueries({ queryKey: ["invitation", updatedInvitation.id] });
      // Invalidate "projects" and members lists since accepting adds them to the project
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", updatedInvitation.project_id] });
    },
  });
}

export function useDeclineInvitation() {
  const queryClient = useQueryClient();
  return useMutation<ProjectInvitationResponse, Error, string>({
    mutationFn: async (invitationId) => {
      const res = await fetch(`${BASE_URL}/${invitationId}/decline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getStoredToken()}` },
      });
      if (!res.ok) throw new Error("Failed to decline invitation");
      return res.json();
    },
    onSuccess: (updatedInvitation) => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      queryClient.invalidateQueries({ queryKey: ["invitation", updatedInvitation.id] });
    },
  });
}

export function useDeleteInvitation() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (invitationId) => {
      const res = await fetch(`${BASE_URL}/${invitationId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getStoredToken()}` },
      });
      if (!res.ok) throw new Error("Failed to delete invitation");
    },
    onSuccess: (_, invitationId) => {
      queryClient.removeQueries({ queryKey: ["invitation", invitationId] });
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
    },
  });
}
