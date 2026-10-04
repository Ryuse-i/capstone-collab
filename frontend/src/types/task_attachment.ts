export interface FileResponse {
  id: string;
  filename: string;
  size: number;
  content_type: string;
  uploaded_by: string | null;
  created_at: string;
}

export interface TaskAttachmentResponse {
  id: string;
  task_id: string;
  file_id: string;
  created_at: string;
  file: FileResponse;
}

export interface FileUrlResponse {
  url: string;
}