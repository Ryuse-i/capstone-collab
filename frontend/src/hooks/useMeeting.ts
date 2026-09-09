import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/services/apiClient";
import type { CreateMeetingPayload, Meeting } from "@/types/meeting";

const url = "/meetings";

const api = {
  getProjectMeetings: async (projectId: string): Promise<Meeting[]> => {
    const response = await apiClient.get<Meeting[]>(
      `${url}/project/${projectId}`,
    );
    return response.data;
  },

  create: async (payload: CreateMeetingPayload): Promise<Meeting> => {
    const response = await apiClient.post<Meeting>(url, payload);
    return response.data;
  },

  cancel: async (meetingId: string): Promise<Meeting> => {
    const response = await apiClient.delete<Meeting>(`${url}/${meetingId}`);
    return response.data;
  },
};

export const meetingKeys = {
  all: ["meetings"] as const,
  byProject: (projectId: string) => [...meetingKeys.all, projectId] as const,
};

export function useGetProjectMeetings(projectId: string) {
  return useQuery({
    queryKey: meetingKeys.byProject(projectId),
    queryFn: () => api.getProjectMeetings(projectId),
    enabled: !!projectId,
  });
}

export function useCreateMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.create,
    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({
        queryKey: meetingKeys.byProject(payload.project_id),
      });
    },
  });
}

export function useCancelMeeting(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.cancel,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: meetingKeys.byProject(projectId),
      });
    },
  });
}
