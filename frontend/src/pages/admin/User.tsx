import { useDeferredValue, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  LoaderCircle,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  UserRoundPen,
  UsersRound,
  X,
} from "lucide-react";
import AppLayout from "@/layouts/Applayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/useAuth";
import {
  useAdminUsers,
  useCreateInstructor,
  useDeactivateAdminUser,
  useReactivateAdminUser,
  useResetAdminUserPassword,
  useSoftDeleteAdminUser,
  useUpdateAdminUser,
} from "@/hooks/useAdminUsers";
import type {
  AdminUser,
  AdminUserRole,
  CreateInstructorPayload,
  UpdateAdminUserPayload,
} from "@/types/admin_user";

const PAGE_SIZE = 10;

type RoleFilter = AdminUserRole | "all";
type StatusFilter = "all" | "active" | "inactive";
type Feedback = { kind: "success" | "error"; message: string };

interface InstructorForm {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  is_active: boolean;
}

interface EditForm {
  first_name: string;
  last_name: string;
  role: AdminUserRole;
  is_active: boolean;
  must_change_password: boolean;
}

const emptyInstructorForm: InstructorForm = {
  email: "",
  first_name: "",
  last_name: "",
  password: "",
  is_active: true,
};

function getErrorMessage(error: unknown): string {
  const maybeResponse = error as {
    response?: { data?: { detail?: unknown } };
    message?: string;
  };
  const detail = maybeResponse.response?.data?.detail;

  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (typeof item === "object" && item !== null && "msg" in item) {
          return String(item.msg);
        }
        return "";
      })
      .filter(Boolean);
    if (messages.length) return messages.join(" ");
  }
  return maybeResponse.message ?? "The request could not be completed.";
}


function roleLabel(role: AdminUserRole): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}


function UserTableSkeleton() {
  return (
    <div className="space-y-0 divide-y">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="flex h-16.5 items-center gap-4 px-4 sm:px-5">
          <Skeleton className="size-9 rounded-md" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-36 max-w-full" />
            <Skeleton className="h-3 w-52 max-w-full" />
          </div>
          <Skeleton className="hidden h-5 w-20 sm:block" />
          <Skeleton className="size-8" />
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { data: currentUser } = useCurrentUser();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [role, setRole] = useState<RoleFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<InstructorForm>(emptyInstructorForm);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);

  const filters = {
    search: deferredSearch.trim() || undefined,
    role: role === "all" ? undefined : role,
    is_active: status === "all" ? undefined : status === "active",
    page,
    page_size: PAGE_SIZE,
  };
  const usersQuery = useAdminUsers(filters);

  const createMutation = useCreateInstructor();
  const updateMutation = useUpdateAdminUser();
  const deactivateMutation = useDeactivateAdminUser();
  const reactivateMutation = useReactivateAdminUser();
  const resetMutation = useResetAdminUserPassword();
  const deleteMutation = useSoftDeleteAdminUser();

  const users = usersQuery.data?.items ?? [];
  const total = usersQuery.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const firstResult = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastResult = Math.min(page * PAGE_SIZE, total);
  const anyActionPending =
    updateMutation.isPending ||
    deactivateMutation.isPending ||
    reactivateMutation.isPending ||
    deleteMutation.isPending;

  async function runAction(
    action: () => Promise<unknown>,
    successMessage: string,
  ): Promise<boolean> {
    setFeedback(null);
    try {
      await action();
      setFeedback({ kind: "success", message: successMessage });
      return true;
    } catch (error) {
      setFeedback({ kind: "error", message: getErrorMessage(error) });
      return false;
    }
  }

  function beginEdit(user: AdminUser) {
    setEditingUser(user);
    setEditForm({
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      is_active: user.is_active,
      must_change_password: user.must_change_password,
    });
  }

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload: CreateInstructorPayload = {
      ...createForm,
      role: "instructor",
      must_change_password: true,
    };
    const succeeded = await runAction(
      () => createMutation.mutateAsync(payload),
      "Instructor account created.",
    );
    if (succeeded) {
      setCreateOpen(false);
      setCreateForm(emptyInstructorForm);
      setPage(1);
    }
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingUser || !editForm) return;
    const payload: UpdateAdminUserPayload = { ...editForm };
    const succeeded = await runAction(
      () => updateMutation.mutateAsync({ id: editingUser.id, payload }),
      "User account updated.",
    );
    if (succeeded) {
      setEditingUser(null);
      setEditForm(null);
      setPage(1);
    }
  }

  async function submitPasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resetTarget) return;
    const succeeded = await runAction(
      () =>
        resetMutation.mutateAsync({
          id: resetTarget.id,
          password: resetPassword,
        }),
      "Temporary password set. The account is marked to change it.",
    );
    if (succeeded) {
      setResetTarget(null);
      setResetPassword("");
    }
  }

  async function toggleActive(user: AdminUser) {
    const action = user.is_active
      ? () => deactivateMutation.mutateAsync(user.id)
      : () => reactivateMutation.mutateAsync(user.id);
    const succeeded = await runAction(
      action,
      user.is_active ? "User account deactivated." : "User account reactivated.",
    );
    if (succeeded) setPage(1);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const succeeded = await runAction(
      () => deleteMutation.mutateAsync(deleteTarget.id),
      "User account removed.",
    );
    if (succeeded) {
      setDeleteTarget(null);
      setPage(1);
    }
  }

  function updateRoleFilter(value: string) {
    setRole(value as RoleFilter);
    setPage(1);
  }

  function updateStatusFilter(value: string) {
    setStatus(value as StatusFilter);
    setPage(1);
  }

  return (
    <AppLayout breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Users" }]}>
      <main className="mx-auto w-full max-w-7xl px-2 pb-8 sm:px-4">
        <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="size-4 text-[#7A0C2E]" />
              Administration
            </div>
            <h1 className="text-2xl font-semibold tracking-normal text-foreground">Users</h1>
          </div>
          <Button
            onClick={() => {
              setFeedback(null);
              setCreateOpen(true);
            }}
          >
            <Plus data-icon="inline-start" />
            Create instructor
          </Button>
        </div>

        {feedback && (
          <div
            role={feedback.kind === "error" ? "alert" : "status"}
            className={`mt-4 flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
              feedback.kind === "error"
                ? "border-destructive/30 bg-destructive/5 text-destructive"
                : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
            }`}
          >
            {feedback.kind === "error" ? (
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            ) : (
              <Check className="mt-0.5 size-4 shrink-0" />
            )}
            <span className="min-w-0 flex-1">{feedback.message}</span>
            <button
              type="button"
              aria-label="Dismiss message"
              className="rounded p-0.5 opacity-70 hover:opacity-100"
              onClick={() => setFeedback(null)}
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        <section className="mt-5" aria-label="User account list">
          <div className="flex flex-col gap-3 pb-4 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-sm">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search name or email"
                aria-label="Search users by name or email"
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={role} onValueChange={updateRoleFilter}>
                <SelectTrigger aria-label="Filter by role" className="w-36.25">
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="instructor">Instructor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>

              <Select value={status} onValueChange={updateStatusFilter}>
                <SelectTrigger aria-label="Filter by account status" className="w-36.25">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="icon"
                title="Refresh users"
                aria-label="Refresh users"
                onClick={() => void usersQuery.refetch()}
                disabled={usersQuery.isFetching}
              >
                <RefreshCw className={usersQuery.isFetching ? "animate-spin" : ""} />
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-md border bg-card">
            {usersQuery.isError ? (
              <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-5 text-center">
                <AlertTriangle className="size-7 text-destructive" />
                <p className="text-sm font-medium text-foreground">Users could not be loaded.</p>
                <p className="max-w-md text-sm text-muted-foreground">
                  {getErrorMessage(usersQuery.error)}
                </p>
                <Button variant="outline" onClick={() => void usersQuery.refetch()}>
                  Try again
                </Button>
              </div>
            ) : usersQuery.isLoading ? (
              <UserTableSkeleton />
            ) : users.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-5 text-center">
                <div className="flex size-11 items-center justify-center rounded-md bg-[#7A0C2E]/8 text-[#7A0C2E]">
                  <UsersRound className="size-5" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  {search || role !== "all" || status !== "all"
                    ? "No users match these filters."
                    : "No user accounts yet."}
                </p>
                {(search || role !== "all" || status !== "all") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearch("");
                      setRole("all");
                      setStatus("all");
                      setPage(1);
                    }}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            ) : (
              <Table className="min-w-140">
                <TableHeader>
                  <TableRow className="bg-muted/35 hover:bg-muted/35">
                    <TableHead className="pl-5">User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="w-36 pr-4 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const isCurrentUser = user.id === currentUser?.id;
                    const displayName = `${user.first_name} ${user.last_name}`.trim();
                    const initials =
                      `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase() || "U";

                    return (
                      <TableRow key={user.id}>
                        <TableCell className="py-3 pl-5">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#7A0C2E]/8 text-xs font-semibold text-[#7A0C2E]">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="truncate font-medium text-foreground">{displayName || "Unnamed user"}</p>
                                {isCurrentUser && (
                                  <span className="shrink-0 text-xs text-muted-foreground">You</span>
                                )}
                              </div>
                              <p className="max-w-70 truncate text-xs text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            <UserRound className="size-3" />
                            {roleLabel(user.role)}
                          </Badge>
                        </TableCell>

                        <TableCell className="pr-4">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="Edit account"
                              aria-label={`Edit ${displayName || user.email}`}
                              onClick={() => beginEdit(user)}
                              disabled={anyActionPending}
                            >
                              <UserRoundPen />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="Reset password"
                              aria-label={`Reset password for ${displayName || user.email}`}
                              onClick={() => {
                                setResetPassword("");
                                setResetTarget(user);
                              }}
                              disabled={anyActionPending}
                            >
                              <KeyRound />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title={user.is_active ? "Deactivate account" : "Reactivate account"}
                              aria-label={`${user.is_active ? "Deactivate" : "Reactivate"} ${displayName || user.email}`}
                              onClick={() => void toggleActive(user)}
                              disabled={anyActionPending || isCurrentUser}
                            >
                              {user.is_active ? <PowerOff /> : <Power />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="Soft-delete account"
                              aria-label={`Remove ${displayName || user.email}`}
                              onClick={() => setDeleteTarget(user)}
                              disabled={anyActionPending || isCurrentUser}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>

          {!usersQuery.isError && !usersQuery.isLoading && total > 0 && (
            <div className="flex flex-col gap-3 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <p aria-live="polite">
                Showing {firstResult}-{lastResult} of {total}
              </p>
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <span>Page {page} of {pageCount}</span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label="Previous page"
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                    disabled={page <= 1 || usersQuery.isFetching}
                  >
                    <ChevronLeft />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label="Next page"
                    onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                    disabled={page >= pageCount || usersQuery.isFetching}
                  >
                    <ChevronRight />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setCreateForm(emptyInstructorForm);
        }}
      >
        <DialogContent className="max-h-[min(90vh,720px)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create instructor</DialogTitle>
            <DialogDescription>
              Provide a temporary password. The account will be marked to change it.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(event) => void submitCreate(event)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm font-medium" htmlFor="create-first-name">
                First name
                <Input
                  id="create-first-name"
                  autoComplete="given-name"
                  value={createForm.first_name}
                  onChange={(event) => setCreateForm({ ...createForm, first_name: event.target.value })}
                  required
                />
              </label>
              <label className="space-y-1.5 text-sm font-medium" htmlFor="create-last-name">
                Last name
                <Input
                  id="create-last-name"
                  autoComplete="family-name"
                  value={createForm.last_name}
                  onChange={(event) => setCreateForm({ ...createForm, last_name: event.target.value })}
                  required
                />
              </label>
            </div>
            <label className="block space-y-1.5 text-sm font-medium" htmlFor="create-email">
              Email
              <Input
                id="create-email"
                type="email"
                autoComplete="email"
                value={createForm.email}
                onChange={(event) => setCreateForm({ ...createForm, email: event.target.value })}
                required
              />
            </label>
            <label className="block space-y-1.5 text-sm font-medium" htmlFor="create-password">
              Temporary password
              <Input
                id="create-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={createForm.password}
                onChange={(event) => setCreateForm({ ...createForm, password: event.target.value })}
                required
              />
              <span className="block text-xs font-normal text-muted-foreground">At least 8 characters.</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-[#7A0C2E]"
                checked={createForm.is_active}
                onChange={(event) => setCreateForm({ ...createForm, is_active: event.target.checked })}
              />
              Active account
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <LoaderCircle className="animate-spin" />}
                Create account
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editingUser)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingUser(null);
            setEditForm(null);
          }
        }}
      >
        <DialogContent className="max-h-[min(90vh,720px)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit account</DialogTitle>
            <DialogDescription>{editingUser?.email}</DialogDescription>
          </DialogHeader>
          {editForm && editingUser && (
            <form onSubmit={(event) => void submitEdit(event)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm font-medium" htmlFor="edit-first-name">
                  First name
                  <Input
                    id="edit-first-name"
                    value={editForm.first_name}
                    onChange={(event) => setEditForm({ ...editForm, first_name: event.target.value })}
                    required
                  />
                </label>
                <label className="space-y-1.5 text-sm font-medium" htmlFor="edit-last-name">
                  Last name
                  <Input
                    id="edit-last-name"
                    value={editForm.last_name}
                    onChange={(event) => setEditForm({ ...editForm, last_name: event.target.value })}
                    required
                  />
                </label>
              </div>
              <div className="space-y-1.5 text-sm font-medium">
                <label htmlFor="edit-role">Role</label>
                <Select
                  value={editForm.role}
                  onValueChange={(value) => setEditForm({ ...editForm, role: value as AdminUserRole })}
                  disabled={editingUser.id === currentUser?.id}
                >
                  <SelectTrigger id="edit-role" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="instructor">Instructor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-[#7A0C2E]"
                  checked={editForm.is_active}
                  disabled={editingUser.id === currentUser?.id}
                  onChange={(event) => setEditForm({ ...editForm, is_active: event.target.checked })}
                />
                Active account
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-[#7A0C2E]"
                  checked={editForm.must_change_password}
                  onChange={(event) => setEditForm({ ...editForm, must_change_password: event.target.checked })}
                />
                Require password change
              </label>
              {editingUser.id === currentUser?.id && (
                <p className="text-xs text-muted-foreground">Your own role and active status cannot be changed here.</p>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending && <LoaderCircle className="animate-spin" />}
                  Save changes
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(resetTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setResetTarget(null);
            setResetPassword("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>
              Set a temporary password for {resetTarget?.email}. The account will be marked to change it.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(event) => void submitPasswordReset(event)} className="space-y-4">
            <label className="block space-y-1.5 text-sm font-medium" htmlFor="reset-password">
              Temporary password
              <Input
                id="reset-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={resetPassword}
                onChange={(event) => setResetPassword(event.target.value)}
                required
              />
              <span className="block text-xs font-normal text-muted-foreground">At least 8 characters.</span>
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setResetTarget(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={resetMutation.isPending}>
                {resetMutation.isPending && <LoaderCircle className="animate-spin" />}
                Set password
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this account?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.email} will be deactivated and hidden from the user list. Accounts with project memberships or the last active admin cannot be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void confirmDelete()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <LoaderCircle className="animate-spin" />}
              Remove account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
