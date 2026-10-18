import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/services/apiClient";
import type {
  RevisionNoteCreate,
  RevisionNoteResponse,
} from "@/types/revision_note";
// Adjust this path to wherever your task hooks file lives
import { taskKeys } from "./useTask";

const url = "/revision_note";

const api = {
  getByTask: async (task_id: string): Promise<RevisionNoteResponse[]> => {
    try {
      const response = await apiClient.get<RevisionNoteResponse[]>(
        `${url}/tasks/${task_id}`,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to get revision notes", error);
      throw error;
    }
  },

  rejectTask: async (
    task_id: string,
    payload: RevisionNoteCreate,
  ): Promise<RevisionNoteResponse> => {
    try {
      const response = await apiClient.post<RevisionNoteResponse>(
        `${url}/tasks/${task_id}/reject`,
        payload,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to reject task", error);
      throw error;
    }
  },

  resolveNote: async (note_id: string): Promise<RevisionNoteResponse> => {
    try {
      const response = await apiClient.patch<RevisionNoteResponse>(
        `${url}/${note_id}/resolve`,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to resolve revision note", error);
      throw error;
    }
  },
};

export const revisionNoteKeys = {
  all: ["revision_notes"] as const,
  byTask: (task_id: string) => [...revisionNoteKeys.all, "task", task_id] as const,
};

export function useGetRevisionNotes(task_id: string) {
  return useQuery({
    queryKey: revisionNoteKeys.byTask(task_id),
    queryFn: () => api.getByTask(task_id),
    enabled: !!task_id,
  });
}

export function useRejectTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      task_id,
      payload,
    }: {
      task_id: string;
      payload: RevisionNoteCreate;
    }) => api.rejectTask(task_id, payload),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: revisionNoteKeys.byTask(variables.task_id),
      });
      // Rejecting changes the task status, so refresh the task queries too
      queryClient.invalidateQueries({
        queryKey: taskKeys.detail(variables.task_id),
      });
      queryClient.invalidateQueries({ queryKey: taskKeys.list() });
      queryClient.invalidateQueries({
        queryKey: taskKeys.assignedMembersAll(),
      });
      queryClient.invalidateQueries({ queryKey: ["tasks", "forUser"] });
    },
  });
}

export function useResolveRevisionNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.resolveNote,
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: revisionNoteKeys.byTask(result.task_id),
      });
    },
  });
}