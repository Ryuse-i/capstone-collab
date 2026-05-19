import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { getStoredToken } from "@/services/api"; // Reuse your existing token helper

// ─── TypeScript Types (Matching Pydantic Schemas) ───────────────────────────

export interface TaskCreate {
  name: string;
  description: string;
  created_by: string; // UUID
  project_id: string; // UUID
  supertask_id?: string | null; // UUID
  status: string; // Enum representation matching backend Status
  priority: string; // Enum representation matching backend Priority
  complexity: string; // Enum representation matching backend Complexity
  complexity_points: number;
  category: string; // Enum representation matching backend Category
  deadline: string; // ISO DateTime string
  completed_at?: string | null;
  total_time_spent?: number | null;
}

export interface TaskUpdate {
  name?: string;
  description?: string | null;
  created_by?: string;
  project_id?: string;
  supertask_id?: string | null;
  status?: string;
  priority?: string;
  complexity?: string;
  complexity_points?: number;
  category?: string;
  deadline?: string;
  completed_at?: string | null;
  total_time_spent?: number | null;
}

export interface TaskResponse {
  id: string; // UUID
  name: string;
  description: string | null;
  created_by: string | null;
  project_id: string | null;
  supertask_id: string | null;
  status: string | null;
  priority: string | null;
  complexity: string | null;
  complexity_points: number | null;
  category: string | null;
  deadline: string | null;
  completed_at: string | null;
  total_time_spent: number | null;
  created_at: string | null;
  updated_at: string | null;
}

// Fallback URL routing matching your standard setup
const BASE_URL =
  import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/tasks`
    : "http://127.0.0.1:8000/tasks";

// ─── Fetchers ────────────────────────────────────────────────────────────────

async function fetchAllTasks(): Promise<TaskResponse[]> {
  const res = await fetch(`${BASE_URL}/`, {
    headers: { Authorization: `Bearer ${getStoredToken()}` },
  });
  if (!res.ok) throw new Error("Failed to fetch tasks");
  return res.json();
}

async function fetchOneTask(taskId: string): Promise<TaskResponse> {
  const res = await fetch(`${BASE_URL}/${taskId}`, {
    headers: { Authorization: `Bearer ${getStoredToken()}` },
  });
  if (!res.ok) throw new Error("Task not found");
  return res.json();
}

// ─── Query Hooks ─────────────────────────────────────────────────────────────

/**
 * Fetches all tasks from the global scope.
 */
export function useGetAllTasks() {
  return useQuery<TaskResponse[], Error>({
    queryKey: ["tasks"],
    queryFn: fetchAllTasks,
    enabled: !!getStoredToken(),
    staleTime: 1000 * 60 * 3, // 3 minutes stale time
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetches a single task by its UUID string.
 */
export function useGetOneTask(taskId: string) {
  return useQuery<TaskResponse, Error>({
    queryKey: ["task", taskId],
    queryFn: () => fetchOneTask(taskId),
    enabled: !!taskId && !!getStoredToken(),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
}

// ─── Mutation Hooks ───────────────────────────────────────────────────────────

/**
 * Hook to create a new task.
 * Automatically updates both the global tasks cache and the scoped project/parent task view.
 */
export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation<TaskResponse, Error, TaskCreate>({
    mutationFn: async (data) => {
      const res = await fetch(`${BASE_URL}/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getStoredToken()}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create task");
      return res.json();
    },
    onSuccess: (newTask) => {
      // Invalidate global tasks list
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      
      // Invalidate project scope so dashboard components dynamically react to new workload metrics
      if (newTask.project_id) {
        queryClient.invalidateQueries({ queryKey: ["project-tasks", newTask.project_id] });
        queryClient.invalidateQueries({ queryKey: ["project", newTask.project_id] });
      }
      
      // If it's a subtask, invalidate the parent supertask context
      if (newTask.supertask_id) {
        queryClient.invalidateQueries({ queryKey: ["task", newTask.supertask_id] });
      }
    },
  });
}

/**
 * Hook to update an existing task via partial JSON schema updates (PATCH).
 */
export function useUpdateTask(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation<TaskResponse, Error, TaskUpdate>({
    mutationFn: async (data) => {
      const res = await fetch(`${BASE_URL}/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getStoredToken()}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update task");
      return res.json();
    },
    onSuccess: (updatedTask) => {
      // Direct optimistic UI / local cache update for immediate responsiveness
      queryClient.setQueryData(["task", taskId], updatedTask);
      
      // Invalidate related lists to align data grids
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      
      if (updatedTask.project_id) {
        queryClient.invalidateQueries({ queryKey: ["project-tasks", updatedTask.project_id] });
        queryClient.invalidateQueries({ queryKey: ["project", updatedTask.project_id] }); // Updates health scores
      }
      if (updatedTask.supertask_id) {
        queryClient.invalidateQueries({ queryKey: ["task", updatedTask.supertask_id] });
      }
    },
  });
}

/**
 * Hook to delete a task via its UUID. Cleans up stale data caches directly.
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { taskId: string; projectId?: string; supertaskId?: string | null }>({
    mutationFn: async ({ taskId }) => {
      const res = await fetch(`${BASE_URL}/${taskId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getStoredToken()}` },
      });
      if (!res.ok) throw new Error("Failed to delete task");
    },
    onSuccess: (_, variables) => {
      // Safely eject deleted data out of cache memory
      queryClient.removeQueries({ queryKey: ["task", variables.taskId] });
      
      // Refresh list bindings
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      if (variables.projectId) {
        queryClient.invalidateQueries({ queryKey: ["project-tasks", variables.projectId] });
        queryClient.invalidateQueries({ queryKey: ["project", variables.projectId] });
      }
      if (variables.supertaskId) {
        queryClient.invalidateQueries({ queryKey: ["task", variables.supertaskId] });
      }
    },
  });
}
