import { useState, type ReactNode } from "react";
import {
  Mail,
  Gauge,
  AlertTriangle,
  ShieldAlert,
  Wrench,
  PenLineIcon,
  X,
} from "lucide-react";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

import type {
  ProjectMemberUserSnapshot,
  ProjectRole,
} from "@/types/project_member";
import type { MemberStatus } from "@/types/member_snapshot";

type WorkloadStyle = { label: string; badge: string; bar: string };

// Mirrors the styles defined in Team.tsx. If you tweak the palette there,
// mirror it here too (or better: hoist both copies into a shared
// `memberStyles.ts` and import from both files).
const roleStyles: Record<ProjectRole, string> = {
  admin: "border-purple-400 text-purple-600 bg-purple-50 dark:bg-purple-950/20",
  advisor: "border-blue-400 text-blue-600 bg-blue-50 dark:bg-blue-950/20",
  instructor: "border-indigo-400 text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20",
  leader: "border-orange-400 text-orange-600 bg-orange-50 dark:bg-orange-950/20",
  member: "border-gray-400 text-gray-600 bg-gray-50 dark:bg-gray-800/40",
};

const workloadStyles: Record<MemberStatus, WorkloadStyle> = {
  overloaded: {
    label: "Overloaded",
    badge: "border-red-400 text-red-500 bg-red-50 dark:bg-red-950/20",
    bar: "bg-red-500",
  },
  underutilized: {
    label: "Underutilized",
    badge: "border-yellow-400 text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20",
    bar: "bg-yellow-400",
  },
  normal: {
    label: "Normal",
    badge: "border-green-400 text-green-600 bg-green-50 dark:bg-green-950/20",
    bar: "bg-green-500",
  },
};

function getInitials(first: string, last: string) {
  return `${first?.trim()?.[0] ?? ""}${last?.trim()?.[0] ?? ""}`.toUpperCase();
}

function capacityPercent(multiplier: number) {
  return Math.min(Math.max(multiplier * 100, 0), 200) / 2;
}

export interface MemberDetailDrawerProps {
  member: ProjectMemberUserSnapshot;
  trigger?: ReactNode;
}

export default function MemberDetailDrawer({
  member,
  trigger,
}: MemberDetailDrawerProps) {
  const [open, setOpen] = useState(false);

  const { user, project_role, skills } = member;
  const snapshot = member.snapshots[0];

  const points =
    snapshot !== undefined
      ? parseFloat(snapshot.total_effective_points)
      : undefined;
  const capacity =
    snapshot !== undefined
      ? parseFloat(snapshot.capacity_multiplier)
      : undefined;

  const workload = workloadStyles[snapshot?.workload_status ?? "normal"];
  const initials = getInitials(user.first_name, user.last_name);

  return (
    <Drawer open={open} onOpenChange={setOpen} direction="right">
      <DrawerTrigger asChild>
        {trigger ?? (
          <button
            type="button"
            aria-label={`View ${user.first_name} ${user.last_name}`}
          >
            <PenLineIcon className="w-4 h-4" />
          </button>
        )}
      </DrawerTrigger>

      <DrawerContent className="ml-auto h-full w-full overflow-hidden rounded-none p-0 sm:max-w-md">
        <DrawerHeader className="shrink-0 border-b px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DrawerTitle>Member Details</DrawerTitle>
              <DrawerDescription className="mt-1">
                Skills and workload information for this member.
              </DrawerDescription>
            </div>

            <DrawerClose asChild>
              <button
                type="button"
                className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Close member details"
              >
                <X className="size-4" />
              </button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="custom-scrollbar overflow-y-auto px-6 py-6">
          <div className="space-y-6">
            {/* Identity */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 shrink-0 rounded-full border-2 border-gray-300 flex items-center justify-center bg-primary dark:bg-gray-800 dark:border-gray-600">
                <span className="text-sm font-bold text-primary-foreground dark:text-foreground">
                  {initials}
                </span>
              </div>
              <div className="flex flex-col gap-1 min-w-0">
                <span className="font-semibold text-card-foreground text-sm truncate">
                  {user.first_name.trim()} {user.last_name.trim()}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 truncate">
                  <Mail className="w-3 h-3 shrink-0" />
                  {user.email}
                </span>
                <span
                  className={`text-xs border rounded-full px-2 py-0.5 w-fit capitalize ${roleStyles[project_role]}`}
                >
                  {project_role}
                </span>
              </div>
            </div>

            {snapshot?.silence_warning && (
              <span className="flex items-center gap-1.5 text-xs font-semibold border border-red-400 text-red-500 bg-white dark:bg-red-950/10 rounded px-2 py-1.5 w-fit">
                <ShieldAlert className="w-3.5 h-3.5" />
                No recent activity reported
              </span>
            )}

            {/* Skills */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Wrench className="w-3.5 h-3.5" />
                Skills
              </div>

              {skills && skills.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full border border-[#7A0C2E]/20 bg-[#FBF3E7] px-2 py-0.5 text-xs font-medium text-[#7A0C2E]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">
                  No skills recorded for this member yet.
                </p>
              )}
            </div>

            {/* Workload status */}
            <div className="bg-gray-50 dark:bg-card-foreground/5 rounded-lg px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 dark:text-card-foreground">
                  Workload status
                </p>
                <p className="text-sm font-semibold text-gray-800 dark:text-card-foreground mt-0.5">
                  {workload.label}
                </p>
              </div>
              <span
                className={`text-xs font-bold border rounded px-2 py-1 ${workload.badge}`}
              >
                {workload.label.toUpperCase()}
              </span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 border-b pb-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1 text-blue-500">
                  <Gauge className="w-3.5 h-3.5" />
                  <span className="text-xs text-gray-400">Points</span>
                </div>
                <span className="text-2xl font-bold text-gray-800 dark:text-card-foreground">
                  {points !== undefined ? points : "—"}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1 text-gray-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span className="text-xs text-gray-400">Capacity</span>
                </div>
                <span className="text-2xl font-bold text-gray-800 dark:text-card-foreground">
                  {capacity !== undefined ? `${capacity.toFixed(1)}x` : "—"}
                </span>
              </div>
            </div>

            {/* Capacity multiplier bar */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-gray-500 dark:text-card-foreground">
                <span>Capacity multiplier</span>
                <span>
                  {capacity !== undefined
                    ? `${capacity.toFixed(2)}x`
                    : "No data"}
                </span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${workload.bar}`}
                  style={{
                    width: `${capacity !== undefined ? capacityPercent(capacity) : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <DrawerFooter className="shrink-0 gap-2 border-t bg-muted/40 px-6 py-3">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}