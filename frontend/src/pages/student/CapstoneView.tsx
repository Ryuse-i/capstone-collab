import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/layouts/Applayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  ArrowLeft,
  BookOpen,
  Users,
  LucideCalendarDays,
  Sparkles,
  AlertTriangle,
  Download,
  Trash2,
} from "lucide-react";
import {
  useGetOnePaper,
  useDeletePaper,
  useGetPaperFileUrl,
} from "@/hooks/usePapers";

const BACK_HREF = "/capstone-search";

function truncateTitle(title: string, maxLength = 40) {
  if (!title) return "";
  if (title.length <= maxLength) return title;
  return `${title.slice(0, maxLength)}...`;
}

function CapstoneViewSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-8 w-28" />
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
        <div className="flex items-start gap-3">
          <Skeleton className="mt-1 h-6 w-6 shrink-0 rounded-sm" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-6 w-4/5" />
            <Skeleton className="h-6 w-2/5" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pl-9">
          <Skeleton className="h-5 w-28 rounded-full" />
          <Skeleton className="h-5 w-36 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <div className="flex flex-col gap-3 border-t border-border pl-9 pt-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    </div>
  );
}

export default function CapstoneView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const paperId = id ? parseInt(id, 10) : 0;

  const { data: paper, isLoading, error } = useGetOnePaper(paperId);
  const getFileUrl = useGetPaperFileUrl();
  const deletePaper = useDeletePaper();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Open a blank tab synchronously (popup blockers allow this on click), then
  // point it at the signed URL once it arrives.
  const handleOpenFile = () => {
    const tab = window.open("", "_blank");
    if (tab) tab.opener = null;
    getFileUrl.mutate(paperId, {
      onSuccess: (url) => {
        if (tab) tab.location.href = url;
        else window.location.href = url;
      },
      onError: () => tab?.close(),
    });
  };

  const handleDelete = () => {
    deletePaper.mutate(paperId, {
      onSuccess: () => {
        navigate(BACK_HREF, { replace: true });
      },
      onError: (err) => {
        setDeleteError(
          err instanceof Error ? err.message : "Could not delete the paper."
        );
      },
    });
  };

  if (error) {
    return (
      <AppLayout
        breadcrumbs={[
          { label: "Research Repository", href: BACK_HREF },
          { label: "Error", href: "#" },
        ]}
      >
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <p className="text-foreground">{error.message}</p>
          <Button variant="outline" onClick={() => navigate(BACK_HREF)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to repository
          </Button>
        </div>
      </AppLayout>
    );
  }

  if (isLoading) {
    return (
      <AppLayout
        breadcrumbs={[
          { label: "Research Repository", href: BACK_HREF },
          { label: "Loading", href: "#" },
        ]}
      >
        <CapstoneViewSkeleton />
      </AppLayout>
    );
  }

  if (!paper) {
    return (
      <AppLayout
        breadcrumbs={[
          { label: "Research Repository", href: BACK_HREF },
          { label: "Not Found", href: "#" },
        ]}
      >
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <p className="text-muted-foreground">
            We couldn't find that paper. It may have been deleted.
          </p>
          <Button variant="outline" onClick={() => navigate(BACK_HREF)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to repository
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      breadcrumbs={[
        { label: "Research Repository", href: BACK_HREF },
        {
          label: truncateTitle(paper.title, 40),
          href: `/admin/capstone-view/${paper.id}`,
        },
      ]}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(BACK_HREF)}
            className="-ml-2 w-fit"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to repository
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!paper.file_path || getFileUrl.isPending}
              onClick={handleOpenFile}
            >
              <Download className="mr-2 h-4 w-4" />
              {!paper.file_path
                ? "No file attached"
                : getFileUrl.isPending
                  ? "Opening…"
                  : getFileUrl.isError
                    ? "Couldn't open. Retry"
                    : "Open file"}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        {/* Title & meta card */}
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
          <div className="flex items-start gap-3">
            <BookOpen className="mt-1 h-6 w-6 shrink-0 text-muted-foreground" />
            <h1 className="text-xl font-semibold leading-snug text-gray-900 dark:text-card-foreground">
              {paper.title}
            </h1>
          </div>

          {paper.keywords?.length > 0 && (
            <div className="flex flex-wrap gap-2 pl-9">
              {paper.keywords.map((tag: string) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2 border-t border-border pl-9 pt-4 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <LucideCalendarDays className="h-4 w-4" />
              Year:{" "}
              <span className="text-foreground">
                {paper.published_date
                  ? paper.published_date.split("-")[0]
                  : "N/A"}
              </span>
            </span>
            <span className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              Authors:{" "}
              <span className="text-foreground">
                {paper.authors?.join(", ") || "N/A"}
              </span>
            </span>
          </div>
        </div>

        {/* Abstract */}
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-gray-900 dark:text-card-foreground">
              Abstract
            </h2>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {paper.abstract}
          </p>
        </div>
      </div>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) setDeleteError(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this paper?</AlertDialogTitle>
            <AlertDialogDescription>
              "{paper.title}" and its uploaded file will be removed from the
              repository and from search results. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p className="text-sm text-destructive">{deleteError}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePaper.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault(); // keep dialog open until the request settles
                handleDelete();
              }}
              disabled={deletePaper.isPending}
            >
              {deletePaper.isPending ? "Deleting…" : "Delete paper"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}