import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCreateMeeting } from "@/hooks/useMeeting";
import type { MeetingProvider } from "@/types/meeting";

function defaultStartTime() {
  const start = new Date(Date.now() + 60 * 60 * 1000);
  start.setSeconds(0, 0);
  const offset = start.getTimezoneOffset();
  return new Date(start.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function isGoogleMeetUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "meet.google.com";
  } catch {
    return false;
  }
}

export function MeetingDialog({
  open,
  onOpenChange,
  projectId,
  provider,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  provider: MeetingProvider;
}) {
  const createMeeting = useCreateMeeting();
  const [selectedProvider, setSelectedProvider] =
    useState<MeetingProvider>(provider);
  const [topic, setTopic] = useState("Weekly Capstone Meeting");
  const [joinUrl, setJoinUrl] = useState("");
  const [startTime, setStartTime] = useState(defaultStartTime);
  const [duration, setDuration] = useState("60");
  const [validationError, setValidationError] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError("");

    if (selectedProvider === "google_meet" && !isGoogleMeetUrl(joinUrl)) {
      setValidationError("Enter a valid HTTPS link from meet.google.com.");
      return;
    }

    const parsedStart = new Date(startTime);
    if (Number.isNaN(parsedStart.getTime())) {
      setValidationError("Choose a valid start time.");
      return;
    }

    createMeeting.mutate(
      {
        project_id: projectId,
        provider: selectedProvider,
        topic: topic.trim(),
        start_time: parsedStart.toISOString(),
        duration_minutes: Number(duration),
        ...(selectedProvider === "google_meet"
          ? { join_url: joinUrl.trim() }
          : {}),
      },
      {
        onSuccess: () => {
          toast.success("Meeting created");
          onOpenChange(false);
        },
        onError: () => {
          toast.error(
            selectedProvider === "zoom"
              ? "Unable to create the Zoom meeting. Please try again."
              : "Unable to save the Google Meet link. Please try again.",
          );
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Create Meeting</DialogTitle>
            <DialogDescription>
              {selectedProvider === "google_meet"
                ? "Create a Google Meet first, then paste its meeting link here."
                : "Create a scheduled Zoom meeting for this project."}
            </DialogDescription>
          </DialogHeader>

          <label className="grid gap-2 text-sm font-medium">
            Provider
            <select
              value={selectedProvider}
              onChange={(event) => {
                setSelectedProvider(event.target.value as MeetingProvider);
                setValidationError("");
              }}
              className="h-9 rounded-md border bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="google_meet">Google Meet</option>
              <option value="zoom">Zoom</option>
            </select>
          </label>

          <label className="grid gap-2 text-sm font-medium">
            Topic
            <input
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              required
              maxLength={255}
              className="h-9 rounded-md border bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring"
            />
          </label>

          {selectedProvider === "google_meet" && (
            <label className="grid gap-2 text-sm font-medium">
              Google Meet URL
              <input
                value={joinUrl}
                onChange={(event) => setJoinUrl(event.target.value)}
                placeholder="https://meet.google.com/abc-defg-hij"
                required
                type="url"
                className="h-9 rounded-md border bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring"
              />
              <span className="text-xs font-normal text-muted-foreground">
                Use an HTTPS link from meet.google.com.
              </span>
            </label>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              Start Time
              <input
                type="datetime-local"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                required
                className="h-9 rounded-md border bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Duration (minutes)
              <input
                type="number"
                min={1}
                max={1440}
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
                required
                className="h-9 rounded-md border bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
          </div>

          {validationError && (
            <p className="text-sm text-destructive">{validationError}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMeeting.isPending}>
              {createMeeting.isPending ? "Creating..." : "Create Meeting"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
