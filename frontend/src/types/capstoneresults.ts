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
 * Individual sentence/passage match within a paper
 */
export interface SentenceMatch {
  text: string;
  score: number;
}

/**
 * Matches PaperResponse in schema.py
 */
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

/**
 * Matches PaperSearchResult in schema.py
 */
export interface PaperSearchResult {
  paper_id: number;
  title: string;
  authors: string[];
  published_date?: string | null; // ISO date string
  matching_snippet: string;
  score: number; // cosine similarity, higher = more relevant (max 1.0)
  matches?: SentenceMatch[]; // passage-level matches ordered by score
}

/**
 * Matches PaperCreate in schema.py
 */
export interface PaperCreate {
  title: string;
  abstract: string;
  authors: string[];
  published_date?: string | null; // ISO date string
  keywords: string[];
  file_path?: string | null;
}

/**
 * Matches PaperUpdate in schema.py
 */
export interface PaperUpdate {
  title?: string | null;
  abstract?: string | null;
  authors?: string[] | null;
  published_date?: string | null; // ISO date string
  keywords?: string[] | null;
  file_path?: string | null;
}