import { fetchWithRefresh } from "./api";

export interface PaperFilters {
  year?: number;
  author?: string;
  keyword?: string;
  limit?: number;
  offset?: number;
}

export interface PaperSearchParams {
  query: string;
  limit?: number;
  year?: number;
  author?: string;
  min_score?: number;
}

/**
 * GET /papers/ - List papers with optional filters and pagination
 */
export async function listPapers(filters: PaperFilters = {}) {
  const queryParams = new URLSearchParams();

  if (filters.year !== undefined) queryParams.append("year", filters.year.toString());
  if (filters.author !== undefined) queryParams.append("author", filters.author);
  if (filters.keyword !== undefined) queryParams.append("keyword", filters.keyword);
  if (filters.limit !== undefined) queryParams.append("limit", filters.limit.toString());
  if (filters.offset !== undefined) queryParams.append("offset", filters.offset.toString());

  const queryString = queryParams.toString();
  const url = queryString ? `/papers/?${queryString}` : "/papers/";

  return await fetchWithRefresh<PaperResponse[]>(url);
}

/**
 * GET /papers/search/ - Semantic search for papers
 */
export async function searchPapers(params: PaperSearchParams) {
  const queryParams = new URLSearchParams();

  queryParams.append("q", params.query);
  if (params.limit !== undefined) queryParams.append("limit", params.limit.toString());
  if (params.year !== undefined) queryParams.append("year", params.year.toString());
  if (params.author !== undefined) queryParams.append("author", params.author);
  if (params.min_score !== undefined) queryParams.append("min_score", params.min_score.toString());

  const url = `/papers/search/?${queryParams.toString()}`;
  return await fetchWithRefresh<PaperSearchResult[]>(url);
}

/**
 * GET /papers/{paper_id}/ - Get a single paper by ID
 */
export async function getPaper(paperId: number) {
  return await fetchWithRefresh<PaperResponse>(`/papers/${paperId}/`);
}


/**
 * PATCH /papers/{paper_id}/ - Update an existing paper
 */
export async function updatePaper(paperId: number, paperData: PaperUpdate) {
  return await fetchWithRefresh<PaperResponse>(
    `/papers/${paperId}/`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(paperData),
    }
  );
}

/**
 * DELETE /papers/{paper_id}/ - Delete a paper
 */
export async function deletePaper(paperId: number) {
  return await fetchWithRefresh<void>(
    `/papers/${paperId}/`,
    {
      method: "DELETE",
    }
  );
}

// Types that match the backend schemas
export interface PaperCreate {
  title: string;
  abstract: string;
  authors: string[];
  published_date?: string | null; // ISO date string
  keywords: string[];
  file_path?: string | null;
}

export interface PaperUpdate {
  title?: string | null;
  abstract?: string | null;
  authors?: string[] | null;
  published_date?: string | null; // ISO date string
  keywords?: string[] | null;
  file_path?: string | null;
}

export interface PaperResponse {
  id: number;
  title: string;
  abstract: string;
  authors: string[];
  published_date?: string | null; // ISO date string
  keywords: string[];
  file_path?: string | null;
  created_at: string; // ISO datetime string
}

export interface MatchedSentence {
  text: string;
  score: number;
}

export interface PaperSearchResult {
  paper_id: number;
  title: string;
  authors: string[];
  category?: string;
  published_date?: string | null; // ISO date string
  matching_snippet: string;
  matches: MatchedSentence[]; // Sentence-level matches with scores
  score: number; // overall paper similarity score
}