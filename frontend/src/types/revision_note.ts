export interface RevisionNoteCreate {
  problem: string;
  recommended_changes?: string | null;
}

export interface RevisionNoteResponse {
  id: string;
  task_id: string;
  revision_number: number;
  problem: string;
  recommended_changes: string | null;
  rejected_at: string;
  resolved_at: string | null;
}