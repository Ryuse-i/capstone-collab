import { useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  useAcceptInviteLink,
  usePreviewInviteLink,
} from "@/hooks/useInviteLink";
import type { InviteInvalidReason, InviteRole } from "@/types/inviteLinks";

const ROLE_LABELS: Record<InviteRole, string> = {
  member: "a project member",
  instructor: "an instructor",
  advisor: "an advisor",
};

const REASON_MESSAGES: Record<InviteInvalidReason, string> = {
  expired: "This invite link has expired.",
  revoked: "This invite link was revoked.",
  used_up: "This invite link has reached its maximum number of uses.",
};

const statusOf = (error: unknown): number | undefined =>
  (error as { response?: { status?: number } })?.response?.status;

export default function InvitePage() {
  const { token = "" } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const preview = usePreviewInviteLink(token);
  const accept = useAcceptInviteLink();

  const handleAccept = () => {
    accept.mutate(token, {
      onSuccess: (result) => {
        toast.success(
          result.already_member
            ? "You're already a member of this project"
            : "You've joined the project",
        );
        navigate(`/projects/${result.project_id}`); // adjust to your route
      },
      onError: (error) => {
        const status = statusOf(error);
        if (status === 401) {
          // not logged in: go to login and come back here afterwards
          navigate(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
        } else if (status === 410) {
          toast.error("This invite link is no longer valid");
          preview.refetch();
        } else {
          toast.error("Failed to accept the invitation");
        }
      },
    });
  };

  if (preview.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const notFound = preview.isError;
  const data = preview.data;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {notFound ? "Invite not found" : "Project invitation"}
          </CardTitle>
          <CardDescription>
            {notFound && "This invite link doesn't exist or is incorrect."}
            {data?.valid &&
              `${data.inviter_name} invited you to join a project.`}
            {data && !data.valid && data.reason && REASON_MESSAGES[data.reason]}
          </CardDescription>
        </CardHeader>

        {data?.valid && (
          <CardContent>
            <p className="text-sm">
              You've been invited to <strong>{data.project_name}</strong> as{" "}
              <strong>{ROLE_LABELS[data.role]}</strong>.
            </p>
          </CardContent>
        )}

        <CardFooter className="flex gap-2">
          {data?.valid ? (
            <Button onClick={handleAccept} disabled={accept.isPending}>
              {accept.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Accept invitation"
              )}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => navigate("/")}>
              Go home
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}