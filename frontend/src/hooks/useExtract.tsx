import { useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/services/apiClient";
import type { ExtractedPaper, PaperCreatePayload, PaperResponse } from "@/types/extract";

const url = "/admin-paper"; // Adjust base path according to your FastAPI router prefix

const api = {
  extractPaper: async (file: File): Promise<ExtractedPaper> => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await apiClient.post<ExtractedPaper>(
        `${url}/extract`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error("Failed to extract paper info", error);
      throw error;
    }
  },

  uploadPaper: async (payload: PaperCreatePayload): Promise<PaperResponse> => {
    try {
      const formData = new FormData();

      // Append PDF file
      formData.append("file", payload.file);

      // Append optional scalar fields if present
      if (payload.title) formData.append("title", payload.title);
      if (payload.abstract) formData.append("abstract", payload.abstract);
      if (payload.category) formData.append("category", payload.category);
      if (payload.research_problem) formData.append("research_problem", payload.research_problem);
      if (payload.methodology) formData.append("methodology", payload.methodology);
      if (payload.published_date) formData.append("published_date", payload.published_date);

      // Append array fields (FastAPI expects multiple form entries for lists)
      if (payload.keywords && payload.keywords.length > 0) {
        payload.keywords.forEach((keyword) => formData.append("keywords", keyword));
      }
      if (payload.authors && payload.authors.length > 0) {
        payload.authors.forEach((author) => formData.append("authors", author));
      }

      const response = await apiClient.post<PaperResponse>(url, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    } catch (error) {
      console.error("Failed to upload paper", error);
      throw error;
    }
  },
};

export const paperKeys = {
  all: ["papers"] as const,
  lists: () => [...paperKeys.all, "list"] as const,
  details: () => [...paperKeys.all, "detail"] as const,
  detail: (id: string) => [...paperKeys.details(), id] as const,
};

/**
 * Step 1: Extract paper information from uploaded PDF to pre-fill the UI form.
 */
export function useExtractPaper() {
  return useMutation({
    mutationFn: (file: File) => api.extractPaper(file),
  });
}

/**
 * Step 2: Upload PDF, create paper entry, and trigger embeddings.
 */
export function useUploadPaper() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PaperCreatePayload) => api.uploadPaper(payload),
    onSuccess: () => {
      // Invalidate paper lists when a new paper is created
      queryClient.invalidateQueries({ queryKey: paperKeys.lists() });
      queryClient.invalidateQueries({ queryKey: paperKeys.all });
    },
  });
}