import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import type {
  ProjectCreate,
  ProjectUpdate,
  ProjectResponse,
  ProjectResponseSnapshot,
} from "../types/project";
import { getStoredToken } from "@/services/api"; // reuse your existing token helper

const BASE_URL =
  import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/projects";

// ─── Fetchers ────────────────────────────────────────────────────────────────

async function fetchAllProjects(): Promise<ProjectResponse[]> {
  const res = await fetch(`${BASE_URL}/`, {
    headers: { Authorization: `Bearer ${getStoredToken()}` },
  });
  if (!res.ok) throw new Error("Failed to fetch projects");
  return res.json();
}

async function fetchOneProject(projectId: string): Promise<ProjectResponse> {
  const res = await fetch(`${BASE_URL}/${projectId}`, {
    headers: { Authorization: `Bearer ${getStoredToken()}` },
  });
  if (!res.ok) throw new Error("Project not found");
  return res.json();
}

async function fetchUserProject(userId: string): Promise<ProjectResponse> {
  const res = await fetch(`${BASE_URL}/user/${userId}`, {
    headers: { Authorization: `Bearer ${getStoredToken()}` },
  });
  if (!res.ok) throw new Error("No project found for this user");
  return res.json();
}

async function fetchUserProjectWithSnapshot(
  userId: string,
): Promise<ProjectResponseSnapshot> {
  const res = await fetch(`${BASE_URL}/user/${userId}`, {
    headers: { Authorization: `Bearer ${getStoredToken()}` },
  });
  if (!res.ok) throw new Error("No project found for this user");
  return res.json();
}

// ─── Query hooks ─────────────────────────────────────────────────────────────

export function useGetAllProjects() {
  return useQuery<ProjectResponse[], Error>({
    queryKey: ["projects"],
    queryFn: fetchAllProjects,
    enabled: !!getStoredToken(),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
}

export function useGetOneProject(projectId: string) {
  return useQuery<ProjectResponse, Error>({
    queryKey: ["project", projectId],
    queryFn: () => fetchOneProject(projectId),
    enabled: !!projectId && !!getStoredToken(),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
}

export function useGetUserProject(userId: string) {
  return useQuery<ProjectResponse, Error>({
    queryKey: ["project", "user", userId],
    queryFn: () => fetchUserProject(userId),
    enabled: !!userId && !!getStoredToken(),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
}

/** Primary hook used by the Dashboard — fetches project + latest snapshot */
export function useGetUserProjectWithSnapshot(
  userId: string,
): UseQueryResult<ProjectResponseSnapshot, Error> {
  return useQuery<ProjectResponseSnapshot, Error>({
    queryKey: ["project", "user", userId, "snapshot"],
    queryFn: () => fetchUserProjectWithSnapshot(userId),
    enabled: !!userId && !!getStoredToken(),

    // ─── Infinite Loop Fixes ───────────────────────────────────────────
    retry: false, // Stop automatic retries when 404/error returns
    refetchOnWindowFocus: false, // Stops layout from flashing/refreshing unexpectedly
    refetchOnMount: false, // Prevent refetching immediately on every remount
    staleTime: 1000 * 60 * 5, // Keep data/error valid for 5 mins
    gcTime: 1000 * 60 * 5, // Retain response profile in cache without dropping it
  });
}

// ─── Mutation hooks ───────────────────────────────────────────────────────────

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation<ProjectResponse, Error, ProjectCreate>({
    mutationFn: async (data) => {
      const res = await fetch(`${BASE_URL}/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getStoredToken()}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create project");
      return res.json();
    },
    onSuccess: (newProject) => {
      // Invalidate list view configurations
      queryClient.invalidateQueries({ queryKey: ["projects"] });

      // Force instant hydration of the empty dashboard states matching this user
      queryClient.invalidateQueries({
        queryKey: ["project", "user", newProject.created_by],
      });
    },
  });
}

export function useUpdateProject(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation<ProjectResponse, Error, ProjectUpdate>({
    mutationFn: async (data) => {
      const res = await fetch(`${BASE_URL}/${projectId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getStoredToken()}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update project");
      return res.json();
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["project", projectId], updated);
      queryClient.invalidateQueries({ queryKey: ["projects"] });

      // Invalidate the snapshot workspace cache so it updates anywhere on the dashboard
      queryClient.invalidateQueries({
        queryKey: ["project", "user", updated.created_by],
      });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { projectId: string; userId: string }>({
    mutationFn: async ({ projectId }) => {
      const res = await fetch(`${BASE_URL}/${projectId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getStoredToken()}` },
      });
      if (!res.ok) throw new Error("Failed to delete project");
    },
    onSuccess: (_, variables) => {
      queryClient.removeQueries({ queryKey: ["project", variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });

      // Instantly wipe dashboard tracking values back to "Not Found" state safely
      queryClient.invalidateQueries({
        queryKey: ["project", "user", variables.userId],
      });
    },
  });
}
