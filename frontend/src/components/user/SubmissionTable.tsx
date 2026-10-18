import { useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ViewSubmissionDrawer } from "@/components/user/ViewSubmissionDrawer";

import type { TaskResponseMembers } from "@/types/task";
import type { UserBase } from "@/types/user";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const complexityStyle: Record<string, string> = {
  high: "bg-red-50 text-red-600 dark:bg-red-500/20 dark:text-red-400",
  medium:
    "bg-yellow-50 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400",
  low: "bg-gray-50 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400",
};

function getAssignees(task: TaskResponseMembers): UserBase[] {
  return task.assigned_members ?? [];
}

function getUserName(member: UserBase): string {
  const fullName = `${member.first_name} ${member.last_name}`.trim();

  return fullName || member.email;
}

function getInitials(member: UserBase): string {
  const first = member.first_name?.[0] ?? "";
  const last = member.last_name?.[0] ?? "";
  const initials = `${first}${last}`;

  return initials || (member.email?.[0] ?? "?");
}

function formatDate(value?: string) {
  if (!value) return "No date set";

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function AssigneeList({ members }: { members: UserBase[] }) {
  if (members.length === 0) {
    return <span className="text-xs text-neutral-400">—</span>;
  }

  const visible = members.slice(0, 3);
  const extra = members.length - visible.length;

  return (
    <div className="flex items-center -space-x-2">
      {visible.map((member) => (
        <Avatar
          key={member.id}
          title={getUserName(member)}
          className="size-8 border-2 border-background"
        >
          <AvatarFallback className="rounded-full bg-primary text-10 font-bold uppercase text-primary-foreground">
            {getInitials(member)}
          </AvatarFallback>
        </Avatar>
      ))}

      {extra > 0 && (
        <Avatar
          title={members
            .slice(3)
            .map((member) => getUserName(member))
            .join(", ")}
          className="size-8 border-2 border-background"
        >
          <AvatarFallback className="rounded-full bg-muted text-10 font-medium text-muted-foreground">
            +{extra}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

type SubmissionsTableProps = {
  /** Pass ALL project tasks; the component filters submitted/completed itself. */
  tasks: TaskResponseMembers[];
  isLoading?: boolean;
  isError?: boolean;
};

export function SubmissionsTable({
  tasks,
  isLoading = false,
  isError = false,
}: SubmissionsTableProps) {
  const [selectedSubmission, setSelectedSubmission] =
    useState<TaskResponseMembers | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [memberFilter, setMemberFilter] = useState("all");

  const submittedTasks = tasks.filter(
    (task) => task.status === "submitted"
  );

  const memberOptions = Array.from(
    new Map(
      submittedTasks
        .flatMap((task) => getAssignees(task))
        .map((member) => [member.id, member] as const),
    ).values(),
  );

  const filteredSubmissions = submittedTasks.filter((task) => {
    if (statusFilter !== "all" && task.status !== statusFilter) {
      return false;
    }

    if (
      memberFilter !== "all" &&
      !getAssignees(task).some((member) => member.id === memberFilter)
    ) {
      return false;
    }

    return true;
  });

  return (
    <div className="mt-6 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>

          <SelectContent position="popper" align="start" className="w-40">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
          </SelectContent>
        </Select>

        <Select value={memberFilter} onValueChange={setMemberFilter}>
          <SelectTrigger className="h-8 w-40">
            <SelectValue placeholder="Assigned Member" />
          </SelectTrigger>

          <SelectContent position="popper" align="start" className="w-40">
            <SelectItem value="all">All Members</SelectItem>

            {memberOptions.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {getUserName(member)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="p-0">
        <CardContent className="p-0">
          <div className="custom-scrollbar">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Complexity</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-8 text-center text-muted-foreground"
                    >
                      Loading submissions...
                    </TableCell>
                  </TableRow>
                ) : isError ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-8 text-center text-rose-600"
                    >
                      Failed to load submissions.
                    </TableCell>
                  </TableRow>
                ) : filteredSubmissions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-10 text-center text-muted-foreground"
                    >
                      No submissions yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSubmissions.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium text-gray-800 dark:text-gray-200">
                        {task.name}
                      </TableCell>

                      <TableCell>
                        {task.category ? (
                          <Badge variant="outline" className="capitalize">
                            {task.category}
                          </Badge>
                        ) : (
                          <span className="text-xs text-neutral-400">—</span>
                        )}
                      </TableCell>

                      <TableCell>
                        {task.complexity ? (
                          <Badge
                            className={`${
                              complexityStyle[task.complexity] ??
                              "bg-gray-100 text-gray-500"
                            } border-0 capitalize`}
                          >
                            {task.complexity}
                          </Badge>
                        ) : (
                          <span className="text-xs text-neutral-400">—</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <AssigneeList members={getAssignees(task)} />
                      </TableCell>

                      <TableCell className="text-muted-foreground">
                        {task.deadline
                          ? formatDate(task.deadline)
                          : "No deadline"}
                      </TableCell>

                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => setSelectedSubmission(task)}
                        >
                          Open
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ViewSubmissionDrawer
        open={!!selectedSubmission}
        onOpenChange={(open) => {
          if (!open) setSelectedSubmission(null);
        }}
        task={selectedSubmission}
      />
    </div>
  );
}

export default SubmissionsTable;