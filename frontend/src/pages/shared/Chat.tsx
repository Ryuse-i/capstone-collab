import { useEffect, useRef, useState } from "react";
import AppLayout from "@/layouts/Applayout";
import googlemeetlogo from "@/assets/googlemeetlogo.png";
import zoomlogo from "@/assets/zoomlogo.png";
import { Send, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useGetCurrentProject } from "@/hooks/useProject";
import { useCurrentUser } from "@/hooks/useAuth";
import { useGetProjectMessages, useSendMessage } from "@/hooks/useMessage";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTrigger,
} from "@/components/ui/popover";

// Local-only UI state for the call banner — not persisted, no backend yet.
type ActiveCall = {
  provider: "Gmeet" | "Zoom";
  joined: boolean;
} | null;

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
  const { data: user } = useCurrentUser();
  const { data: currentProject } = useGetCurrentProject(user?.id ?? "");
  const projectId = currentProject?.id ?? "";

  const {
    data: messages,
    isLoading: messagesLoading,
    isFetching,
  } = useGetProjectMessages(projectId);
  const { mutate: sendMessage, isPending: sending } = useSendMessage(projectId);

  const [input, setInput] = useState("");
  const [activeCall, setActiveCall] = useState<ActiveCall>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || !projectId) return;
    sendMessage(input.trim(), {
      onSuccess: () => setInput(""),
    });
  };

  const startCall = (provider: "Gmeet" | "Zoom") => {
    setActiveCall({ provider, joined: false });
  };

  const joinCall = () => {
    if (!activeCall) return;
    setActiveCall({ ...activeCall, joined: true });
  };

  return (
    <AppLayout breadcrumbs={[{ label: "Chat", href: "/chat" }]}>
      <Card className="mt-2 pb-1 overflow-hidden h-[85vh] flex flex-col">
        <CardContent className="p-0 flex flex-col flex-1 min-h-0">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 pb-2 shrink-0">
            <div className="flex items-center gap-3">
              <div className="text-lg font-medium">
                {currentProject?.name || "Project chat"}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 px-2">
                    <Video className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-40 p-3">
                  <PopoverHeader>
                    <PopoverDescription className="flex flex-col gap-2">
                      <Button
                        onClick={() => startCall("Gmeet")}
                        className="flex w-full items-center gap-3 justify-start rounded-md border px-4 py-3"
                        variant="outline"
                      >
                        <img
                          src={googlemeetlogo}
                          alt="google meet"
                          className="h-5 w-5 shrink-0"
                        />
                        Gmeet
                      </Button>
                      <Button
                        onClick={() => startCall("Zoom")}
                        className="flex w-full items-center gap-3 justify-start rounded-md border px-4 py-3"
                        variant="outline"
                      >
                        <img
                          src={zoomlogo}
                          alt="zoom"
                          className="h-5 w-5 shrink-0"
                        />
                        Zoom
                      </Button>
                    </PopoverDescription>
                  </PopoverHeader>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {activeCall && !activeCall.joined ? (
            <div className="mx-4 mt-2 shrink-0 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-900 dark:border-green-900/40 dark:bg-green-950/50 dark:text-green-100">
              {activeCall.provider} call is ongoing.{" "}
              <button
                type="button"
                onClick={joinCall}
                className="font-semibold underline"
              >
                Tap to join
              </button>
            </div>
          ) : null}

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
    </AppLayout>
  );
}
