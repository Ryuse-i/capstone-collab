import { useQuery } from "@tanstack/react-query";
import apiClient from "@/services/apiClient";

const url = "/users";

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
