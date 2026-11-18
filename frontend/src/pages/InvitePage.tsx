import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useCurrentUser } from "@/hooks/useAuth";
import { useAcceptInviteLink } from "@/hooks/useInviteLink";

const statusOf = (error: unknown): number | undefined =>
  (error as { response?: { status?: number } })?.response?.status;

export default function InvitePage() {
  const { token = "" } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { data: user, isError, isLoading } = useCurrentUser();
  const { mutate: acceptInvite } = useAcceptInviteLink();
  const attemptedToken = useRef<string | null>(null);
  const invitePath = `/invite/${token}`;
  const loginPath = `/login?next=${encodeURIComponent(invitePath)}`;

  useEffect(() => {
    if (!token || isLoading) return;

    if (isError || !user) {
      navigate(loginPath, { replace: true });
      return;
    }

    if (attemptedToken.current === token) return;
    attemptedToken.current = token;

    acceptInvite(token, {
      onSuccess: (result) => {
        toast.success(
          result.already_member
            ? "You're already a member of this project."
            : "You've joined the project.",
        );
        navigate("/dashboard", { replace: true });
      },
      onError: (error) => {
        if (statusOf(error) === 401) {
          navigate(loginPath, { replace: true });
          return;
        }

        toast.error(
          statusOf(error) === 404 || statusOf(error) === 410
            ? "This invite link is invalid, expired, or no longer active."
            : "Couldn't join with this invite link. Please try again.",
        );
        navigate("/dashboard", { replace: true });
      },
    });
  }, [
    acceptInvite,
    isError,
    isLoading,
    loginPath,
    navigate,
    token,
    user,
  ]);

  return (
    <div
      className="flex min-h-screen items-center justify-center gap-3 text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
      <span>Joining your project...</span>
    </div>
  );
}
