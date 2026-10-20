import { useState } from "react";
import { toast } from "sonner";
import { Check, ChevronDown } from "lucide-react";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCreateMeeting } from "@/hooks/useMeeting";
import { cn } from "@/lib/utils";
import type { MeetingProvider } from "@/types/meeting";

const PROVIDER_OPTIONS: { value: MeetingProvider; label: string }[] = [
  { value: "google_meet", label: "Google Meet" },
  { value: "zoom", label: "Zoom" },
];

const PROVIDER_COPY: Record<
  MeetingProvider,
  {
    name: string;
    placeholder: string;
    hint: string;
    invalid: string;
    saveError: string;
  }
> = {
  google_meet: {
    name: "Google Meet",
    placeholder: "https://meet.google.com/abc-defg-hij",
    hint: "Use an HTTPS link from meet.google.com.",
    invalid: "Enter a valid HTTPS link from meet.google.com.",
    saveError: "Unable to save the Google Meet link. Please try again.",
  },
  zoom: {
    name: "Zoom",
    placeholder: "https://zoom.us/j/1234567890",
    hint: "Use an HTTPS link from zoom.us.",
    invalid: "Enter a valid HTTPS link from zoom.us.",
    saveError: "Unable to save the Zoom link. Please try again.",
  },
};

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

function isZoomUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (url.hostname === "zoom.us" || url.hostname.endsWith(".zoom.us"))
    );
  } catch {
    return false;
  }
}

function isValidJoinUrl(provider: MeetingProvider, value: string) {
  return provider === "google_meet" ? isGoogleMeetUrl(value) : isZoomUrl(value);
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
  const [providerOpen, setProviderOpen] = useState(false);
  const [topic, setTopic] = useState("Weekly Capstone Meeting");
  const [joinUrl, setJoinUrl] = useState("");
  const [startTime] = useState(defaultStartTime);
  const [duration] = useState("60");
  const [validationError, setValidationError] = useState("");

  const copy = PROVIDER_COPY[selectedProvider];

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError("");

    if (!isValidJoinUrl(selectedProvider, joinUrl.trim())) {
      setValidationError(copy.invalid);
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
        join_url: joinUrl.trim(),
      },
      {
        onSuccess: () => {
          toast.success("Meeting created");
          onOpenChange(false);
        },
        onError: () => {
          toast.error(copy.saveError);
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
              Create a {copy.name} meeting first, then paste its meeting link
              here.
            </DialogDescription>
          </DialogHeader>

          {/* Provider */}
          <div className="grid gap-2">
            <span className="text-sm font-medium">Provider</span>

            <Popover open={providerOpen} onOpenChange={setProviderOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={providerOpen}
                  className="w-full justify-between text-left font-normal"
                >
                  <span
                    className={cn(!selectedProvider && "text-muted-foreground")}
                  >
                    {PROVIDER_OPTIONS.find(
                      (option) => option.value === selectedProvider,
                    )?.label ?? "Select provider"}
                  </span>

                  <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>

              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <div
                  className="max-h-64 overflow-y-auto overscroll-contain custom-scrollbar p-1"
                  onWheel={(e) => e.stopPropagation()}
                >
                  {PROVIDER_OPTIONS.map((option) => {
                    const selected = selectedProvider === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          if (option.value !== selectedProvider) {
                            // A link for one provider isn't valid for the other
                            setJoinUrl("");
                          }
                          setSelectedProvider(option.value);
                          setValidationError("");
                          setProviderOpen(false);
                        }}
                        className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                      >
                        <span>{option.label}</span>

                        {selected && (
                          <Check className="h-4 w-4 text-popover-foreground" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          </div>

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

          <label className="grid gap-2 text-sm font-medium">
            {copy.name} URL
            <input
              value={joinUrl}
              onChange={(event) => setJoinUrl(event.target.value)}
              placeholder={copy.placeholder}
              required
              type="url"
              className="h-9 rounded-md border bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring"
            />
            <span className="text-xs font-normal text-muted-foreground">
              {copy.hint}
            </span>
          </label>

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