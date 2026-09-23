import { useEffect, useRef, useState } from "react";
import AppLayout from "@/layouts/Applayout";
import { CalendarClock, ExternalLink, Send, Video, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useGetCurrentProject } from "@/hooks/useProject";
import { useCurrentUser } from "@/hooks/useAuth";
import { useGetCurrentMember } from "@/hooks/useProjectMember";
import { useGetProjectMessages, useSendMessage } from "@/hooks/useMessage";
import { useGetProjectMeetings } from "@/hooks/useMeeting";
import type { MeetingProvider } from "@/types/meeting";

function getInitials(firstName?: string | null, lastName?: string | null) {
  if (!firstName && !lastName) return "?";
  return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Chat() {
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const { data: user } = useCurrentUser();
  const { data: currentProject, isLoading: projectLoading, isError: projectError } = useGetCurrentProject(user?.id ?? "");
  const projectId = currentProject?.id ?? "";
  const { data: currentMember, isLoading: memberLoading, isError: memberError } = useGetCurrentMember(user?.id ?? "");
  const currentMemberRole = currentMember?.project_role.toLowerCase();
  const canManageMeetings =
    user?.role?.toLowerCase() === "admin" ||
    ["leader", "advisor", "instructor"].includes(currentMemberRole ?? "");
  const {
    data: meetings = [],
    isLoading: meetingsLoading,
    isError: meetingsError,
  } = useGetProjectMeetings(projectId);

  const {
    data: messages,
    isLoading: messagesLoading,
    isFetching,
  } = useGetProjectMessages(projectId);
  const { mutate: sendMessage, isPending: sending } = useSendMessage(projectId);

  const [input, setInput] = useState("");
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);
  const [meetingProvider] = useState<MeetingProvider>("google_meet");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Combine loading states
  const combinedLoading = projectLoading || memberLoading || meetingsLoading || messagesLoading;
  
  // Combined error state
  const combinedError = projectError || memberError || meetingsError;

  useEffect(() => {
    // Simulate loading delay for consistency
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300); // 300ms delay to show loading state

    // Set error if any of the individual requests errored
    if (combinedError) {
      setIsError(true);
      setErrorMessage("Failed to load chat data. Please try again.");
    }

    return () => clearTimeout(timer);
  }, [projectLoading, memberLoading, meetingsLoading, messagesLoading, combinedError]);

  useEffect(() => {
    if (scrollRef.current && !isLoading && !isError) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, isError]);

  const handleSend = () => {
    if (!input.trim() || !projectId) return;
    sendMessage(input.trim(), {
      onSuccess: () => setInput(""),
    });
  };

  return (
    <AppLayout breadcrumbs={[{ label: "Chat", href: "/chat" }]}>
      {isError ? (
        <div className="min-h-screen flex items-center justify-center bg-background dark:bg-muted">
          <div className="text-center">
            <div className="rounded-full h-12 w-12 border-b-2 border-destructive mb-4">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <p className="text-foreground dark:text-muted-foreground">
              {errorMessage}
            </p>
          </div>
        </div>
      ) : isLoading ? (
        <div className="min-h-screen flex items-center justify-center bg-background dark:bg-muted">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
            <p className="text-foreground dark:text-muted-foreground">Loading chat...</p>
          </div>
        </div>
      ) : (
        <>
          <Card className="mt-2 pb-1 overflow-hidden h-[85vh] flex flex-col">
            <CardContent className="p-0 flex flex-col flex-1 min-h-0">
              {/* Header */}
              <div className="flex items-center justify-between border-b px-4 pb-2 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="text-lg font-medium">
                    {currentProject?.name || "Project chat"}
                  </div>
                </div>

                {canManageMeetings && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => setMeetingDialogOpen(true)}
                      aria-label="Create meeting"
                      title="Create meeting"
                    >
                      <Video className="h-4 w-4" />
                      <span className="ml-2 hidden sm:inline">Create meeting</span>
                    </Button>
                  </div>
                )}
              </div>

              {/* Messages area */}
              <div
                ref={scrollRef}
                className="p-6 flex-1 min-h-0 overflow-auto bg-white dark:bg-[#101014] custom-scrollbar"
              >
                {isFetching && messagesLoading ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Loading messages...
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {meetingsLoading && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100">
                        Loading meeting details...
                      </div>
                    )}
                    {meetingsError && (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100">
                        Unable to load meeting details.
                      </div>
                    )}
                    {meetings
                      .filter((meeting) => meeting.status === "scheduled")
                      .map((meeting) => (
                        <div
                          key={`meeting-${meeting.id}`}
                          className={`flex ${
                            meeting.created_by === user?.id
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          <div className="flex max-w-[85%] items-center gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-emerald-950 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-50">
                            <CalendarClock className="h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-300" />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                                Meeting available
                              </p>
                              <p className="truncate font-semibold">
                                {meeting.topic}
                              </p>
                              <p className="text-xs text-emerald-800/80 dark:text-emerald-200/80">
                                {meeting.provider === "google_meet"
                                  ? "Google Meet"
                                  : "Zoom"}
                                {meeting.start_time
                                  ? ` · ${new Date(
                                      meeting.start_time,
                                    ).toLocaleString([], {
                                      dateStyle: "medium",
                                      timeStyle: "short",
                                    })}`
                                  : ""}
                              </p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              className="shrink-0 bg-emerald-700 text-white hover:bg-emerald-800"
                              onClick={() =>
                                window.open(
                                  meeting.join_url,
                                  "_blank",
                                  "noopener,noreferrer",
                                )
                              }
                            >
                              <ExternalLink className="mr-1 h-3.5 w-3.5" />
                              Join
                            </Button>
                          </div>
                        </div>
                      ))}
                    {messages?.map((msg) => {
                      const isMe = msg.sender_id === user?.id;
                      const sender = msg.sender;

                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                        >
                          {!isMe && (
                            <div className="mr-3 mt-7 h-8 w-8 rounded-full bg-primary dark:bg-gray-800 flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {getInitials(sender.first_name, sender.last_name)}
                            </div>
                          )}

                          <div
                            className={`max-w-[70%] p-3 rounded-lg ${
                              isMe
                                ? "bg-[#800000] text-white dark:bg-[#6a0101]"
                                : "bg-gray-100 dark:bg-[#16161a] text-foreground"
                            }`}
                          >
                            {!isMe && (
                              <div className="text-xs font-semibold mb-1 opacity-80">
                                {sender
                                  ? `${sender.first_name} ${sender.last_name}`
                                  : "Unknown"}
                              </div>
                            )}
                            <div className="text-sm">{msg.content}</div>
                            <div className="text-[11px] text-muted-foreground mt-1 text-right">
                              {formatTime(msg.created_at)}
                            </div>
                          </div>

                          {isMe && (
                            <div className="ml-3 mt-7 h-8 w-8 rounded-full bg-primary dark:bg-gray-800 flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {getInitials(user?.first_name, user?.last_name)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {!messages?.length && (
                      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        No messages yet — say hello.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Separator className="shrink-0" />

              {/* Input */}
              <div className="p-2 flex items-center gap-3 shrink-0">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  rows={1}
                  disabled={!projectId || sending}
                  className="flex-1 resize-none rounded-md border px-3 py-2 bg-transparent text-sm focus:outline-none disabled:opacity-50"
                  placeholder="Type your message"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <Button
                  onClick={handleSend}
                  disabled={!projectId || sending || !input.trim()}
                  className="h-10"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
          <MeetingDialog
            key={meetingProvider}
            open={meetingDialogOpen}
            onOpenChange={setMeetingDialogOpen}
            projectId={projectId}
            provider={meetingProvider}
          />
        </>
      )}
    </AppLayout>
  );
}
