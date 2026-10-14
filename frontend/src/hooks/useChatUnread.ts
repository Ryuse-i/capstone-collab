import { useEffect, useState } from "react";
import { useGetProjectMessages } from "@/hooks/useMessage";

const SEEN_EVENT = "chat-seen-change";

const storageKey = (userId: string, projectId: string) =>
  `chat-last-seen:${userId}:${projectId}`;

type MessageLike = { created_at: string; sender_id?: string | null };

function readLastSeen(userId: string, projectId: string): number | null {
  if (!userId || !projectId) return null;
  try {
    const value = localStorage.getItem(storageKey(userId, projectId));
    return value === null ? null : Number(value);
  } catch {
    return null;
  }
}

function writeLastSeen(userId: string, projectId: string, timestamp: number) {
  try {
    localStorage.setItem(storageKey(userId, projectId), String(timestamp));
    // Same-tab listeners (the sidebar) don't get "storage" events,
    // so we notify them manually.
    window.dispatchEvent(new Event(SEEN_EVENT));
  } catch {
    // storage unavailable — ignore
  }
}

function latestMessageTime(messages?: MessageLike[]): number | null {
  if (!messages?.length) return null;
  return messages.reduce(
    (max, msg) => Math.max(max, new Date(msg.created_at).getTime()),
    0,
  );
}

/** Call from the Chat page: marks everything currently loaded as seen. */
export function markChatSeen(
  userId: string,
  projectId: string,
  messages?: MessageLike[],
) {
  if (!userId || !projectId) return;

  const latest = latestMessageTime(messages);
  if (latest === null) return;

  const current = readLastSeen(userId, projectId);
  if (current !== null && current >= latest) return;

  writeLastSeen(userId, projectId, latest);
}

/** Returns true when someone else has sent a message you haven't seen. */
export function useChatUnread(userId: string, projectId: string) {
  const { data: messages } = useGetProjectMessages(projectId);

  const [lastSeen, setLastSeen] = useState<number | null>(() =>
    readLastSeen(userId, projectId),
  );

  useEffect(() => {
    const sync = () => setLastSeen(readLastSeen(userId, projectId));

    sync();
    window.addEventListener(SEEN_EVENT, sync);
    window.addEventListener("storage", sync); // other tabs

    return () => {
      window.removeEventListener(SEEN_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [userId, projectId]);

  // First time we see this project: baseline to the latest message so
  // old history doesn't light up the dot.
  useEffect(() => {
    if (!userId || !projectId || !messages) return;
    if (lastSeen !== null) return;

    writeLastSeen(userId, projectId, latestMessageTime(messages) ?? 0);
  }, [userId, projectId, messages, lastSeen]);

  const latestIncoming = latestMessageTime(
    messages?.filter((msg) => msg.sender_id !== userId),
  );

  return lastSeen !== null && latestIncoming !== null && latestIncoming > lastSeen;
}