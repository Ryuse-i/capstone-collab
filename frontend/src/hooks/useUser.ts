import { useQuery, useQueryClient, useMutation} from "@tanstack/react-query";
import apiClient from "@/services/apiClient";

const url = "/users";

export interface UpdateUserPayload {
  email?: string;
  password?: string;
  first_name?: string;
  last_name?: string;
  role?: "admin" | "student" | "instructor";
  is_active?: boolean;
  is_verified?: boolean;
}

export interface UpdateProfilePayload {
  first_name: string;
  last_name: string;
}


async function getOneUser(id: string) {
  const response = await apiClient.get(`${url}/${id}`);
  return response.data;
}

export function useGetOneUser(id?: string) {
  return useQuery({
    queryKey: id ? ["users", id] : ["users", "idle"],
    queryFn: () => getOneUser(id!),
    enabled: !!id,
  });
}

export function useUpdateMyProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateProfilePayload) => {
      const response = await apiClient.patch("/users/me/profile", data);
      return response.data;
    },
    // Broad on purpose: refreshes whatever key useCurrentUser uses.
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}