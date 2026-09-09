export type MeetingProvider = "zoom" | "google_meet";
export type MeetingStatus = "scheduled" | "cancelled" | "completed";

export interface Meeting {
  id: string;
  project_id: string;
  created_by: string;
  provider: MeetingProvider;
  meeting_id: string | null;
  join_url: string;
  host_url: string | null;
  topic: string;
  start_time: string | null;
  end_time: string | null;
  status: MeetingStatus;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateMeetingPayload {
  project_id: string;
  provider: MeetingProvider;
  topic: string;
  start_time: string;
  duration_minutes: number;
  join_url?: string;
}
