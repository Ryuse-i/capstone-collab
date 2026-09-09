import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/services/apiClient";
import type {
  CreateTask,
  UpdateTask,
  TaskResponse,
  TaskResponseMembers,
} from "@/types/task";

const url = "/tasks";

const api = {
  getOneTask: async (task_id: string): Promise<TaskResponse> => {
    try {
      const response = await apiClient.get<TaskResponse>(`${url}/${task_id}`);
      return response.data;
    } catch (error) {
      console.error("Failed to get task", error);
      throw error;
    }
  },

  getAllTask: async (): Promise<TaskResponse[]> => {
    try {
      const response = await apiClient.get<TaskResponse[]>(url);
      return response.data;
    } catch (error) {
      console.error("Failed to get all task", error);
      throw error;
    }
  },

  getAllProjectTask: async (project_id: string): Promise<TaskResponse[]> => {
    try {
      const response = await apiClient.get(`${url}/projects/${project_id}`);
      return response.data;
    } catch (error) {
      console.error("Failed to get project tasks", error);
      throw error;
    }
  },

  createTask: async (task: CreateTask): Promise<TaskResponse> => {
    try {
      const response = await apiClient.post<TaskResponse>(url, task);
      return response.data;
    } catch (error) {
      console.error("Failed to create task", error);
      throw error;
    }
  },

  updateTask: async (id: string, task: UpdateTask): Promise<TaskResponse> => {
    try {
      const response = await apiClient.patch<TaskResponse>(
        `${url}/${id}`,
        task,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to update task", error);
      throw error;
    }
  },

  deleteTask: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`${url}/${id}`);
    } catch (error) {
      console.error("Failed to delete task", error);
      throw error;
    }
  },

  getAllTaskAssignedMembers: async (
    id: string,
  ): Promise<TaskResponseMembers[]> => {
    try {
      const response = await apiClient.get<TaskResponseMembers[]>(
        `${url}/assigned-members/${id}`,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to get tasks", error);
      throw error;
    }
  },

  getTasksForUser: async (
    user_id: string,
  ): Promise<TaskResponseMembers[]> => {
    try {
      const response = await apiClient.get<TaskResponseMembers[]>(
        `${url}/assigned-members/user/${user_id}`,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to get tasks for user", error);
      throw error;
    }
  },
};

export const taskKeys = {
  all: ["tasks"] as const,
  list: () => [...taskKeys.all, "list"] as const,
  listProject: (project_id: string) =>
    [...taskKeys.list(), "listProject", project_id] as const,
  byProject: (id: string) => [...taskKeys.all, id, "project"] as const,
  details: () => [...taskKeys.all, "details"] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
};

export function useGetOneTask(id: string) {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: () => api.getOneTask(id),
  });
}

export function useGetAllTask() {
  return useQuery({
    queryKey: taskKeys.list(),
    queryFn: api.getAllTask,
  });
}

export function useGetAllProjectTask(project_id: string) {
  return useQuery({
    queryKey: taskKeys.listProject(project_id),
    queryFn: () => api.getAllProjectTask(project_id),
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createTask,
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: taskKeys.byProject(result.project_id),
      });
      queryClient.invalidateQueries({
        queryKey: taskKeys.list(),
      });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, task }: { id: string; task: UpdateTask }) =>
      api.updateTask(id, task),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.list() });
      queryClient.invalidateQueries({
        queryKey: taskKeys.detail(variables.id),
      });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteTask,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.list() });
      queryClient.removeQueries({ queryKey: taskKeys.detail(id) });
    },
  });
}

export function useGetAllTaskAssignedMembers(id: string) {
  return useQuery({
    queryKey: ["tasks", "assignedMembers", id],
    queryFn: () => api.getAllTaskAssignedMembers(id),
    enabled: !!id,
  });
}

export function useGetTasksForUser(user_id: string) {
  return useQuery({
    queryKey: ["tasks", "forUser", user_id],
    queryFn: () => api.getTasksForUser(user_id),
    enabled: !!user_id,
  });
}
