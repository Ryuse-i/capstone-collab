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
export interface PaperCreate {
  title: string;
  abstract: string;
  authors: string[];
  keywords: string[];
  category?: string | null;
  research_problem?: string | null;
  methodology?: string | null;
  published_date?: string | null;
  file_path?: string | null;
}

export interface PaperUpdate {
  title?: string | null;
  abstract?: string | null;
  authors?: string[] | null;
  keywords?: string[] | null;
  category?: string | null;
  research_problem?: string | null;
  methodology?: string | null;
  published_date?: string | null;
  file_path?: string | null;
}

export interface PaperResponse extends PaperCreate {
  id: number;
  embedding_text?: string | null;
  created_at?: string | null;
}

export interface PaperSearchResult {
  paper_id: number;
  title: string;
  authors: string[];
  category?: string | null;
  published_date?: string | null;
  matching_snippet: string;
  score: number;
  matches?: SentenceMatch[];
}