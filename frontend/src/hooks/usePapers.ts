import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import apiClient from "@/services/apiClient";
import type {
  PaperCreate,
  PaperUpdate,
  PaperResponse,
  PaperSearchResult,
  PaperFilters,
  PaperSearchParams,
} from "@/types/capstoneresults";

const url = "/papers/";

const api = {
  getOnePaper: async (paper_id: number): Promise<PaperResponse> => {
    try {
      const response = await apiClient.get<PaperResponse>(`${url}${paper_id}/`);
      return response.data;
    } catch (error) {
      console.error("Failed to get paper", error);
      throw error;
    }
  },

  getAllPapers: async (filters: PaperFilters = {}): Promise<PaperResponse[]> => {
    try {
      const response = await apiClient.get<PaperResponse[]>(url, {
        params: filters, // axios skips undefined values
      });
      return response.data;
    } catch (error) {
      console.error("Failed to get papers", error);
      throw error;
    }
  },

  searchPapers: async (
    params: PaperSearchParams,
  ): Promise<PaperSearchResult[]> => {
    try {
      const { query, ...rest } = params;
      const response = await apiClient.get<PaperSearchResult[]>(
        `${url}search/`,
        { params: { q: query, ...rest } },
      );
      return response.data;
    } catch (error) {
      console.error("Failed to search papers", error);
      throw error;
    }
  },

  createPaper: async (paper: PaperCreate): Promise<PaperResponse> => {
    try {
      const response = await apiClient.post<PaperResponse>(url, paper);
      return response.data;
    } catch (error) {
      console.error("Failed to create paper", error);
      throw error;
    }
  },

  updatePaper: async (
    id: number,
    paper: PaperUpdate,
  ): Promise<PaperResponse> => {
    try {
      const response = await apiClient.patch<PaperResponse>(
        `${url}${id}/`,
        paper,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to update paper", error);
      throw error;
    }
  },

  deletePaper: async (id: number): Promise<void> => {
    try {
      await apiClient.delete(`${url}${id}/`);
    } catch (error) {
      console.error("Failed to delete paper", error);
      throw error;
    }
  },
};

export const paperKeys = {
  all: ["papers"] as const,
  lists: () => [...paperKeys.all, "list"] as const,
  list: (filters: PaperFilters) => [...paperKeys.lists(), filters] as const,
  searches: () => [...paperKeys.all, "search"] as const,
  search: (params: PaperSearchParams) =>
    [...paperKeys.searches(), params] as const,
  details: () => [...paperKeys.all, "details"] as const,
  detail: (id: number) => [...paperKeys.details(), id] as const,
};

export function useGetOnePaper(id: number) {
  return useQuery({
    queryKey: paperKeys.detail(id),
    queryFn: () => api.getOnePaper(id),
    enabled: !!id,
  });
}

export function useGetAllPapers(filters: PaperFilters = {}) {
  return useQuery({
    queryKey: paperKeys.list(filters),
    queryFn: () => api.getAllPapers(filters),
  });
}

export function useSearchPapers(params: PaperSearchParams) {
  return useQuery({
    queryKey: paperKeys.search(params),
    queryFn: () => api.searchPapers(params),
    enabled: params.query.trim() !== "",
    placeholderData: keepPreviousData, // keep old results visible while typing
  });
}

export function useCreatePaper() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createPaper,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paperKeys.lists() });
      queryClient.invalidateQueries({ queryKey: paperKeys.searches() });
    },
  });
}

export function useUpdatePaper() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, paper }: { id: number; paper: PaperUpdate }) =>
      api.updatePaper(id, paper),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: paperKeys.lists() });
      queryClient.invalidateQueries({ queryKey: paperKeys.searches() });
      queryClient.invalidateQueries({
        queryKey: paperKeys.detail(variables.id),
      });
    },
  });
}

export function useDeletePaper() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deletePaper,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: paperKeys.lists() });
      queryClient.invalidateQueries({ queryKey: paperKeys.searches() });
      queryClient.removeQueries({ queryKey: paperKeys.detail(id) });
    },
  });
}