import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/services/apiClient";
import type {
  InviteLinkCreate,
  InviteLinkCreated,
  InviteLinkResponse,
  InviteLinkPreview,
  InviteLinkAccepted,
} from "@/types/inviteLinks";

const url = "/invite_link";

// the shareable link the user copies. the backend only returns the raw token
export const buildInviteUrl = (token: string) =>
  `${window.location.origin}/invite/${token}`;

const api = {
  createInviteLink: async (
    payload: InviteLinkCreate,
  ): Promise<InviteLinkCreated> => {
    try {
      const response = await apiClient.post<InviteLinkCreated>(
        `${url}/`,
        payload,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to create invite link", error);
      throw error;
    }
  },

  getProjectInviteLinks: async (
    project_id: string,
  ): Promise<InviteLinkResponse[]> => {
    try {
      const response = await apiClient.get<InviteLinkResponse[]>(
        `${url}/project/${project_id}`,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to get project invite links", error);
      throw error;
    }
  },

  previewInviteLink: async (token: string): Promise<InviteLinkPreview> => {
    try {
      const response = await apiClient.get<InviteLinkPreview>(
        `${url}/preview/${token}`,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to preview invite link", error);
      throw error;
    }
  },

  acceptInviteLink: async (token: string): Promise<InviteLinkAccepted> => {
    try {
      const response = await apiClient.post<InviteLinkAccepted>(
        `${url}/accept/${token}`,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to accept invite link", error);
      throw error;
    }
  },

  revokeInviteLink: async (id: string): Promise<InviteLinkResponse> => {
    try {
      const response = await apiClient.delete<InviteLinkResponse>(
        `${url}/${id}`,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to revoke invite link", error);
      throw error;
    }
  },
};

export const inviteLinkKeys = {
  all: ["inviteLinks"] as const,
  lists: () => [...inviteLinkKeys.all, "list"] as const,
  listProject: (project_id: string) =>
    [...inviteLinkKeys.lists(), project_id] as const,
  previews: () => [...inviteLinkKeys.all, "preview"] as const,
  preview: (token: string) => [...inviteLinkKeys.previews(), token] as const,
};

export function useGetProjectInviteLinks(project_id: string) {
  return useQuery({
    queryKey: inviteLinkKeys.listProject(project_id),
    queryFn: () => api.getProjectInviteLinks(project_id),
    enabled: !!project_id,
  });
}

// public endpoint, used by the /invite/:token page before login
export function usePreviewInviteLink(token: string) {
  return useQuery({
    queryKey: inviteLinkKeys.preview(token),
    queryFn: () => api.previewInviteLink(token),
    enabled: !!token,
    retry: false, // a 404 means the token is wrong, retrying won't help
  });
}

export function useCreateInviteLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createInviteLink,
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: inviteLinkKeys.listProject(result.project_id),
      });
    },
  });
}

export function useRevokeInviteLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.revokeInviteLink,
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: inviteLinkKeys.listProject(result.project_id),
      });
    },
  });
}

export function useAcceptInviteLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.acceptInviteLink,
    onSuccess: () => {
      // the user just joined a project, so refresh anything that lists
      // projects or members. adjust these keys to match your own hooks
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project_members"] });
    },
  });
}