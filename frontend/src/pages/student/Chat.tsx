import { useEffect, useRef, useState } from "react";
import AppLayout from "@/layouts/Applayout";
import { Send, Phone, Video, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useGetCurrentProject } from "@/hooks/useProject";
import { useCurrentUser } from "@/hooks/useAuth";

type Member = {
  id: string;
  name: string;
  initials: string;
  role?: string;
};

type Message = {
  id: string;
  senderId: string;
  text: string;
  time: string;
};

const members: Member[] = [
  { id: "JW", name: "John Wesley", initials: "JW", role: "Frontend" },
  { id: "DM", name: "Dylan Mangaoang", initials: "DM", role: "Backend" },
  { id: "HG", name: "Harry Guzman", initials: "HG", role: "QA" },
  { id: "RM", name: "Rommel", initials: "RM", role: "DevOps" },
];

// Mock conversation (single conversation between current user `JW` and `DM`)
const initialMessages: Message[] = [
  {
    id: "m1",
    senderId: "DM",
    text: "Hey John — are you available to review the API changes?",
    time: "10:55 am",
  },
  {
    id: "m2",
    senderId: "JW",
    text: "Yes — I'll take a look now and push feedback shortly.",
    time: "10:57 am",
  },
  {
    id: "m3",
    senderId: "DM",
    text: "Thanks! Also I uploaded a draft for the endpoint tests.",
    time: "11:01 am",
  },
  {
    id: "m4",
    senderId: "JW",
    text: "Great, I'll check the tests and run them locally.",
    time: "11:04 am",
  },
];

export default function Chat() {
   const { data: user } = useCurrentUser();
    const {
      data: currentProject,
    } = useGetCurrentProject(user?.id ?? "");
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const currentUserId = "JW";

  useEffect(() => {
    // auto-scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;
    const m: Message = {
      id: `m_${Date.now()}`,
      senderId: currentUserId,
      text: input.trim(),
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setMessages((s) => [...s, m]);
    setInput("");
  };

  const otherMember = members.find((m) => m.id === "DM")!;

  return (
    <AppLayout breadcrumbs={[{ label: "Chat", href: "/chat" }]}>
      

      <Card className="mt-4">
        <CardContent className="p-0">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-3">  
              <div className="text-lg font-medium">
                {currentProject?.name || "Project chat"}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="h-8 px-2">
                <Phone className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 px-2">
                <Video className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 px-2">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages area */}
          <div
            ref={scrollRef}
            className="p-6 h-[60vh] overflow-auto bg-white dark:bg-[#101014]"
          >
            <div className="flex flex-col gap-4">
              {messages.map((msg) => {
                const isMe = msg.senderId === currentUserId;
                const sender = members.find((m) => m.id === msg.senderId)!;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                  >
                    {!isMe && (
                      <div className="mr-3 h-8 w-8 rounded-full bg-primary dark:bg-gray-800 flex items-center justify-center text-white text-xs font-bold">
                        {sender.initials}
                      </div>
                    )}

                    <div
                      className={`max-w-[70%] p-3 rounded-lg ${isMe ? "bg-primary text-white" : "bg-gray-100 dark:bg-[#16161a] text-foreground"}`}
                    >
                      <div className="text-sm">{msg.text}</div>
                      <div className="text-[11px] text-muted-foreground mt-1 text-right">
                        {msg.time}
                      </div>
                    </div>

                    {isMe && (
                      <div className="ml-3 h-8 w-8 rounded-full bg-primary dark:bg-gray-800 flex items-center justify-center text-white text-xs font-bold">
                        {currentUserId}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Input */}
          <div className="p-4 flex items-center gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={1}
              className="flex-1 resize-none rounded-md border px-3 py-2 bg-transparent text-sm focus:outline-none"
              placeholder="Type your message"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <Button onClick={sendMessage} className="h-10">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
