export type MemberStatus = "normal" | "underutilized" | "overloaded";
export interface MemberSnapshotBase {
  member_id: string;
  total_effective_points: string;
  capacity_multiplier: string;
  silence_warning: boolean;
  consecutive_fallback_count: number;
  workload_status: MemberStatus;
}

export interface MemberSnapshotResponse extends MemberSnapshotBase {
  id: string;
  snapshot_date: string;
}
