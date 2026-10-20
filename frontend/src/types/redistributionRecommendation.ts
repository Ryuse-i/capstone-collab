// Mirrors the backend `Type` enum (app/modules/redistribution_recommendations/model.py)
// transfer   = Move the whole task to another member
// share      = Add a member so the task is split equally
// split      = Break the task into parts for different members
// reschedule = Move Deadline
export type RecommendationType = "share" | "split" | "transfer" | "reschedule";

export interface RecommendationBase {
  task_id: string | null;
  from_member_id: string | null;
  to_member_id: string | null;
  task_name: string | null;
  from_member_name: string | null;
  to_member_name: string | null;
  current_deadline: string | null; // "YYYY-MM-DD"
  suggested_deadline: string | null; // "YYYY-MM-DD"
  extension_days: number | null;
  points_moved: string | null; // Decimal arrives as a string
  recipient_points: number | null;
  detail: string;
  project_id: string;
  suggestion_type: RecommendationType;
  rank: number;
  expected_workload_after: string;
  deadline_impact: string;
}

export type CreateRecommendation = RecommendationBase;

export type UpdateRecommendation = Partial<RecommendationBase>;

export interface RecommendationResponse extends RecommendationBase {
  id: number; // integer primary key (not a UUID)
  split?: SplitDetails | null;
  created_at: string;
  updated_at: string;
}

export type SplitPart = {
  title: string;
  description: string;
  complexity_points: number;
  primary_skill: string;
  secondary_skills: string[];
  category?: string | null
};

export type SplitDetails = {
  task_name?: string;
  donor_part: SplitPart;
  recipient_part: SplitPart;
  split_rationale: string;
  priority?: string | null 
  supertask_id?: string | null 
};
