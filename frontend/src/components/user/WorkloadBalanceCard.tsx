// components/workload/WorkloadBalanceCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WorkloadBalanceResponse } from "@/types/workloadBalance";

function barColor(value: number) {
  if (value >= 70) return "bg-green-500";
  if (value >= 40) return "bg-yellow-400";
  return "bg-red-500";
}

function ScoreRow({
  label,
  hint,
  value,
  note,
}: {
  label: string;
  hint: string;
  value: string | null;
  note?: string;
}) {
  const num = value === null ? null : Number(value);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-card-foreground">{label}</span>
        <span className="text-xs font-semibold text-card-foreground">
          {num === null ? "N/A" : `${num.toFixed(0)} / 100`}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full ${num === null ? "" : barColor(num)}`}
          style={{ width: `${num === null ? 0 : Math.min(Math.max(num, 0), 100)}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">{note ?? hint}</p>
    </div>
  );
}

interface Props {
  breakdown: WorkloadBalanceResponse | null;
  /** Resolved by the page from max_load_member_id. */
  maxLoadMemberName?: string;
}

export default function WorkloadBalanceCard({ breakdown, maxLoadMemberName }: Props) {
  return (
    <Card className="rounded-xl border shadow-sm lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Workload Balance Breakdown
        </CardTitle>
      </CardHeader>

      <CardContent>
        {!breakdown ? (
          <p className="text-sm text-muted-foreground">
            Press Recalculate to see how the balance score is made up.
          </p>
        ) : !breakdown.applicable ? (
          <p className="text-sm text-muted-foreground">
            Not applicable: there are no active members or no remaining work.
          </p>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <ScoreRow
                label="Spread"
                hint="How evenly load ratios are spread across members."
                value={breakdown.spread_score}
                note={
                  breakdown.spread_used
                    ? undefined
                    : "Not counted: team is too small for a reliable spread."
                }
              />
              <ScoreRow
                label="Overload"
                hint="Share of members who are not overloaded."
                value={breakdown.overload_score}
              />
              <ScoreRow
                label="Severity"
                hint="How far above their limit the most loaded member is."
                value={breakdown.severity_score}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-center md:grid-cols-4">
              <div>
                <span className="text-2xl font-bold text-card-foreground">
                  {Number(breakdown.max_load_ratio).toFixed(2)}x
                </span>
                <span className="block text-xs text-card-foreground">
                  Highest load{maxLoadMemberName ? ` (${maxLoadMemberName})` : ""}
                </span>
              </div>
              <div>
                <span className="text-2xl font-bold text-card-foreground">
                  {Number(breakdown.median_ratio).toFixed(2)}x
                </span>
                <span className="block text-xs text-card-foreground">Median load</span>
              </div>
              <div>
                <span className="text-2xl font-bold text-card-foreground">
                  {breakdown.overloaded_count}/{breakdown.total_members}
                </span>
                <span className="block text-xs text-card-foreground">Overloaded</span>
              </div>
              <div>
                <span className="text-2xl font-bold text-card-foreground">
                  {breakdown.underutilized_member_ids.length}
                </span>
                <span className="block text-xs text-card-foreground">Underutilized</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}