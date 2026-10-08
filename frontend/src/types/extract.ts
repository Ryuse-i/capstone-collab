export interface ExtractedPaper {
  title?: string;
  abstract?: string;
  keywords?: string[];
  category?: string;
  research_problem?: string;
  methodology?: string;
  conclusion?: string;
  authors?: string[];
  published_date?: string; // YYYY-MM-DD
}

export interface PaperCreatePayload {
  file: File;
  title?: string;
  abstract?: string;
  keywords?: string[];
  category?: string;
  research_problem?: string;
  methodology?: string;
  conclusion?: string;
  authors?: string[];
  published_date?: string; // YYYY-MM-DD
}

export interface PaperResponse {
  id: string;
  title: string;
  abstract: string;
  keywords: string[];
  category?: string;
  research_problem?: string;
  methodology?: string;
  conclusion?: string;
  authors: string[];
  published_date?: string;
  file_path: string;
  created_at: string;
}