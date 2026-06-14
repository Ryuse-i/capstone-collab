import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getStoredToken } from "@/services/api";

// ─── Types ────────────────────────────────────────────────────────────────────

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

const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/invitations`
  : "http://127.0.0.1:8000/invitations";

// ─── Plain fetcher (not tied to any mutation instance) ────────────────────────

async function postInvitation(
  data: ProjectInvitationCreate,
): Promise<ProjectInvitationResponse> {
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
}

// ─── Query hooks ──────────────────────────────────────────────────────────────

async function fetchAllInvitations(): Promise<ProjectInvitationResponse[]> {
  const res = await fetch(`${BASE_URL}/`, {
    headers: { Authorization: `Bearer ${getStoredToken()}` },
  });
  if (!res.ok) throw new Error("Failed to fetch invitations");
  return res.json();
}

async function fetchOneInvitation(
  invitationId: string,
): Promise<ProjectInvitationResponse> {
  const res = await fetch(`${BASE_URL}/${invitationId}`, {
    headers: { Authorization: `Bearer ${getStoredToken()}` },
  });
  if (!res.ok) throw new Error("Invitation not found");
  return res.json();
}

export function useGetAllInvitations() {
  return useQuery<ProjectInvitationResponse[], Error>({
    queryKey: ["invitations"],
    queryFn: fetchAllInvitations,
    enabled: !!getStoredToken(),
    staleTime: 1000 * 60 * 5,
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

// ─── useCreateInvitation ─────────────────────────────────────────────────────
//
// Returns the standard mutation (for single one-off calls) plus
// `createManyInvitations` for batch sends (e.g. during project creation).
// Batch sends bypass the shared mutation instance to avoid state collisions
// when firing multiple invites in sequence.

export function useCreateInvitation() {
  const queryClient = useQueryClient();

  const invalidate = (projectIds: string[]) => {
    queryClient.invalidateQueries({ queryKey: ["invitations"] });
    const unique = [...new Set(projectIds)];
    unique.forEach((id) =>
      queryClient.invalidateQueries({ queryKey: ["project", id] }),
    );
  };

  const mutation = useMutation<
    ProjectInvitationResponse,
    Error,
    ProjectInvitationCreate
  >({
    mutationFn: postInvitation,
    onSuccess: (newInvite) => {
      invalidate([newInvite.project_id]);
    },
  });

  /**
   * Send multiple invitations sequentially.
   * Returns which emails succeeded and which failed so the caller
   * can surface partial-failure messages to the user.
   */
  const createManyInvitations = async (
    invites: ProjectInvitationCreate[],
  ): Promise<{ succeeded: ProjectInvitationResponse[]; failed: string[] }> => {
    const succeeded: ProjectInvitationResponse[] = [];
    const failed: string[] = [];

    for (const invite of invites) {
      try {
        const result = await postInvitation(invite);
        succeeded.push(result);
      } catch {
        failed.push(invite.email);
      }
    }

    if (succeeded.length > 0) {
      invalidate(succeeded.map((i) => i.project_id));
    }

    return { succeeded, failed };
  };

  return { ...mutation, createManyInvitations };
}

// ─── useUpdateInvitation ──────────────────────────────────────────────────────

export function useUpdateInvitation(invitationId: string) {
  const queryClient = useQueryClient();
  return useMutation<ProjectInvitationResponse, Error, ProjectInvitationUpdate>(
    {
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
    },
  );
}

// ─── useAcceptInvitation ──────────────────────────────────────────────────────

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
      queryClient.invalidateQueries({
        queryKey: ["invitation", updatedInvitation.id],
      });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({
        queryKey: ["project", updatedInvitation.project_id],
      });
    },
  });
}

// ─── useDeclineInvitation ─────────────────────────────────────────────────────

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
      queryClient.invalidateQueries({
        queryKey: ["invitation", updatedInvitation.id],
      });
    },
  });
}

// ─── useDeleteInvitation ──────────────────────────────────────────────────────

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
